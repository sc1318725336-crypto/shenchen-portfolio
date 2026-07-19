param(
  [string]$SourceRoot = 'G:\作品集\作品\品牌设计',
  [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$utf8 = [Text.UTF8Encoding]::new($false)
$imagePattern = '^\.(png|jpe?g|webp|gif|avif)$'
$assetRoot = Join-Path $WorkspaceRoot 'assets\projects\brand'
$pageRoot = Join-Path $WorkspaceRoot 'projects\brand'
$indexPath = Join-Path $WorkspaceRoot 'index.html'

if (-not (Test-Path -LiteralPath $SourceRoot)) {
  throw "品牌设计源目录不存在：$SourceRoot"
}

Add-Type -AssemblyName System.Drawing

function Get-ImageDimensions {
  param([Parameter(Mandatory)][string]$Path)
  $image = [Drawing.Image]::FromFile($Path)
  try {
    return [pscustomobject]@{ Width = $image.Width; Height = $image.Height }
  } finally {
    $image.Dispose()
  }
}

function Save-CoverThumbnail {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
  )

  $image = [Drawing.Image]::FromFile($Source)
  $bitmap = [Drawing.Bitmap]::new(1280, 960)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $encoderParams = $null
  try {
    $graphics.Clear([Drawing.Color]::Black)
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, 0, 0, 1280, 960)

    $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object MimeType -eq 'image/jpeg' |
      Select-Object -First 1
    $encoderParams = [Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [Drawing.Imaging.EncoderParameter]::new(
      [Drawing.Imaging.Encoder]::Quality,
      [long]88
    )
    $bitmap.Save($Destination, $codec, $encoderParams)
  } finally {
    if ($encoderParams) { $encoderParams.Dispose() }
    $graphics.Dispose()
    $bitmap.Dispose()
    $image.Dispose()
  }
}

function Encode-Html {
  param([AllowEmptyString()][string]$Value)
  return [Net.WebUtility]::HtmlEncode($Value)
}

New-Item -ItemType Directory -Force -Path $assetRoot, $pageRoot | Out-Null

$projects = @()
$directories = @(Get-ChildItem -LiteralPath $SourceRoot -Directory | Sort-Object Name)
foreach ($directory in $directories) {
  $images = @(Get-ChildItem -LiteralPath $directory.FullName -File -Recurse |
    Where-Object { $_.Extension -match $imagePattern } |
    Sort-Object Name, FullName)
  $covers = @($images | Where-Object { $_.BaseName -like '*作为首页封面使用*' })
  if ($covers.Count -ne 1) {
    throw "项目 [$($directory.Name)] 需要且只能有一张名称含 [作为首页封面使用] 的图片，当前找到 $($covers.Count) 张。"
  }

  $orderMatch = [regex]::Match($covers[0].BaseName, '\((\d+)\)')
  if (-not $orderMatch.Success) {
    throw "项目 [$($directory.Name)] 的封面文件名缺少顺序编号：(数字)。"
  }

  $order = [int]$orderMatch.Groups[1].Value
  $projects += [pscustomobject]@{
    Order = $order
    Name = $directory.Name
    Slug = ('project-{0:D2}' -f $order)
    CoverSource = $covers[0].FullName
    DetailSources = @($images | Where-Object FullName -ne $covers[0].FullName)
    Details = @()
  }
}

$projects = @($projects | Sort-Object Order, Name)
$duplicateOrders = @($projects | Group-Object Order | Where-Object Count -gt 1)
if ($duplicateOrders.Count) {
  throw "封面顺序编号有重复：$($duplicateOrders.Name -join ', ')"
}

foreach ($project in $projects) {
  $projectAssetDirectory = Join-Path $assetRoot $project.Slug
  $projectPageDirectory = Join-Path $pageRoot $project.Slug
  New-Item -ItemType Directory -Force -Path $projectAssetDirectory, $projectPageDirectory | Out-Null

  $coverDestination = Join-Path $projectAssetDirectory 'cover.jpg'
  $coverNeedsUpdate = -not (Test-Path -LiteralPath $coverDestination) -or
    (Get-Item -LiteralPath $coverDestination).LastWriteTimeUtc -lt (Get-Item -LiteralPath $project.CoverSource).LastWriteTimeUtc
  if ($coverNeedsUpdate) {
    Save-CoverThumbnail -Source $project.CoverSource -Destination $coverDestination
  }

  $detailItems = @()
  for ($detailIndex = 0; $detailIndex -lt $project.DetailSources.Count; $detailIndex++) {
    $source = $project.DetailSources[$detailIndex]
    $extension = $source.Extension.ToLowerInvariant()
    $fileName = 'detail-{0:D3}{1}' -f ($detailIndex + 1), $extension
    $destination = Join-Path $projectAssetDirectory $fileName
    $detailNeedsUpdate = -not (Test-Path -LiteralPath $destination) -or
      (Get-Item -LiteralPath $destination).Length -ne $source.Length -or
      (Get-Item -LiteralPath $destination).LastWriteTimeUtc -lt $source.LastWriteTimeUtc
    if ($detailNeedsUpdate) {
      Copy-Item -LiteralPath $source.FullName -Destination $destination -Force
    }
    $size = Get-ImageDimensions -Path $source.FullName
    $detailItems += [pscustomobject]@{
      FileName = $fileName
      Width = $size.Width
      Height = $size.Height
      SourceName = $source.Name
    }
  }
  $project.Details = $detailItems
}

$projectCount = $projects.Count
for ($projectIndex = 0; $projectIndex -lt $projectCount; $projectIndex++) {
  $project = $projects[$projectIndex]
  $previous = $projects[($projectIndex - 1 + $projectCount) % $projectCount]
  $next = $projects[($projectIndex + 1) % $projectCount]
  $encodedName = Encode-Html $project.Name
  $imageMarkup = [Text.StringBuilder]::new()

  for ($detailIndex = 0; $detailIndex -lt $project.Details.Count; $detailIndex++) {
    $detail = $project.Details[$detailIndex]
    $number = $detailIndex + 1
    $loading = if ($detailIndex -eq 0) { 'eager' } else { 'lazy' }
    $fetchPriority = if ($detailIndex -eq 0) { ' fetchpriority="high"' } else { '' }
    $alt = Encode-Html "$($project.Name) 品牌设计第 $number 页"
    [void]$imageMarkup.AppendLine("      <figure class=`"project-frame`"><img src=`"../../../assets/projects/brand/$($project.Slug)/$($detail.FileName)`" alt=`"$alt`" width=`"$($detail.Width)`" height=`"$($detail.Height)`" loading=`"$loading`" decoding=`"async`"$fetchPriority /></figure>")
  }

  $pageHtml = @"
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#050505" />
    <meta name="description" content="$encodedName 品牌设计项目完整展示" />
    <title>$encodedName｜品牌设计项目</title>
    <link rel="stylesheet" href="../../../brand-project.css?v=20260719-nav1" />
  </head>
  <body>
    <a class="skip-link" href="#project-content">跳到项目内容</a>
    <nav class="project-topbar" aria-label="项目导航">
      <a class="project-back" href="../../../index.html#brand-build"><span aria-hidden="true">←</span> 返回品牌设计</a>
      <span class="project-position">$('{0:D2}' -f ($projectIndex + 1)) / $('{0:D2}' -f $projectCount)</span>
    </nav>
    <header class="project-header">
      <p class="project-kicker">BRAND DESIGN / $('{0:D2}' -f $project.Order)</p>
      <h1>$encodedName</h1>
      <p class="project-meta">$($project.Details.Count) 张设计展示</p>
    </header>
    <main class="project-gallery" id="project-content">
$($imageMarkup.ToString().TrimEnd())
    </main>
    <nav class="project-pagination" aria-label="相邻项目">
      <a href="../$($previous.Slug)/index.html"><span>上一个项目</span><b>$(Encode-Html $previous.Name)</b></a>
      <a href="../$($next.Slug)/index.html"><span>下一个项目</span><b>$(Encode-Html $next.Name)</b></a>
    </nav>
  </body>
</html>
"@
  [IO.File]::WriteAllText((Join-Path $pageRoot "$($project.Slug)\index.html"), $pageHtml, $utf8)
}

$columnCount = [int][math]::Ceiling($projectCount / 2)
$cylinder = [Text.StringBuilder]::new()
[void]$cylinder.AppendLine("          <!-- BRAND_PROJECT_CARDS_START -->")
[void]$cylinder.AppendLine("          <div class=`"brand-cylinder brand-cylinder--inner`" data-brand-cylinder aria-label=`"可旋转的 $projectCount 个品牌设计项目`">")
for ($columnIndex = 0; $columnIndex -lt $columnCount; $columnIndex++) {
  [void]$cylinder.AppendLine("            <div class=`"brand-column`" data-column=`"$columnIndex`">")
  foreach ($projectIndex in @($columnIndex, ($columnIndex + $columnCount))) {
    if ($projectIndex -ge $projectCount) { continue }
    $project = $projects[$projectIndex]
    $encodedName = Encode-Html $project.Name
    [void]$cylinder.AppendLine("              <a class=`"project-card`" href=`"./projects/brand/$($project.Slug)/index.html`" aria-label=`"查看${encodedName}项目详情`">")
    [void]$cylinder.AppendLine("                <img src=`"./assets/projects/brand/$($project.Slug)/cover.jpg`" alt=`"$encodedName 首页封面`" width=`"1280`" height=`"960`" loading=`"lazy`" decoding=`"async`" />")
    [void]$cylinder.AppendLine("                <span class=`"project-card__label`"><b>$('{0:D2}' -f ($projectIndex + 1))</b><em>$encodedName</em></span>")
    [void]$cylinder.AppendLine("              </a>")
  }
  [void]$cylinder.AppendLine("            </div>")
}
[void]$cylinder.AppendLine("          </div>")
[void]$cylinder.Append("          <!-- BRAND_PROJECT_CARDS_END -->")

$indexHtml = [IO.File]::ReadAllText($indexPath)
$cylinderPattern = '(?s)          (?:<!-- BRAND_PROJECT_CARDS_START -->\r?\n)?<div class="brand-cylinder brand-cylinder--inner".*?          </div>(?:\r?\n          <!-- BRAND_PROJECT_CARDS_END -->)?(?=\r?\n          <button class="more-cases")'
$matches = [regex]::Matches($indexHtml, $cylinderPattern)
if ($matches.Count -ne 1) {
  throw "无法唯一定位首页品牌圆柱区域，匹配数量：$($matches.Count)"
}
$indexHtml = [regex]::Replace($indexHtml, $cylinderPattern, $cylinder.ToString(), 1)
[IO.File]::WriteAllText($indexPath, $indexHtml, $utf8)

$manifest = @($projects | ForEach-Object {
  [ordered]@{
    order = $_.Order
    slug = $_.Slug
    name = $_.Name
    cover = "assets/projects/brand/$($_.Slug)/cover.jpg"
    page = "projects/brand/$($_.Slug)/index.html"
    details = @($_.Details | ForEach-Object { $_.FileName })
  }
})
[IO.File]::WriteAllText((Join-Path $assetRoot 'manifest.json'), ($manifest | ConvertTo-Json -Depth 5), $utf8)

[pscustomobject]@{
  Projects = $projectCount
  DetailImages = @($projects | ForEach-Object { $_.Details }).Count
  SourceRoot = $SourceRoot
  AssetRoot = $assetRoot
  PageRoot = $pageRoot
}