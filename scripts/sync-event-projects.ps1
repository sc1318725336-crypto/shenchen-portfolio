param(
  [string]$FeaturedSource = 'G:\作品集\作品\主页活动设计',
  [string]$ArchiveSource = 'G:\作品集\作品\活动设计',
  [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$utf8 = [Text.UTF8Encoding]::new($false)
$imagePattern = '^\.(png|jpe?g|webp|gif|avif)$'
$assetRoot = Join-Path $WorkspaceRoot 'assets\projects\event'
$pageRoot = Join-Path $WorkspaceRoot 'projects\event'

Add-Type -AssemblyName System.Drawing

function Encode-Html([string]$Value) { [Net.WebUtility]::HtmlEncode($Value) }

function Get-NaturalKey([string]$Value) {
  [regex]::Replace($Value, '\d+', { param($match) $match.Value.PadLeft(12, '0') })
}

function Get-ImageDimensions([string]$Path) {
  $image = [Drawing.Image]::FromFile($Path)
  try { [pscustomobject]@{ Width = $image.Width; Height = $image.Height } }
  finally { $image.Dispose() }
}

function Save-Cover([string]$Source, [string]$Destination, [int]$MaxDimension = 1800, [int]$Quality = 88) {
  $image = [Drawing.Image]::FromFile($Source)
  $longest = [Math]::Max($image.Width, $image.Height)
  $scale = [Math]::Min([double]1.0, [double]$MaxDimension / [double]$longest)
  $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
  $bitmap = [Drawing.Bitmap]::new($width, $height)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $encoderParams = $null
  try {
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, 0, 0, $width, $height)
    $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg' | Select-Object -First 1
    $encoderParams = [Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParams.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    $bitmap.Save($Destination, $codec, $encoderParams)
  } finally {
    if ($encoderParams) { $encoderParams.Dispose() }
    $graphics.Dispose(); $bitmap.Dispose(); $image.Dispose()
  }
}

function Get-Projects([string]$SourceRoot, [string]$Group) {
  if (-not (Test-Path -LiteralPath $SourceRoot)) { throw "活动作品目录不存在：$SourceRoot" }
  $projects = @()
  $directories = @(Get-ChildItem -LiteralPath $SourceRoot -Directory)
  for ($index = 0; $index -lt $directories.Count; $index++) {
    $directory = $directories[$index]
    $images = @(Get-ChildItem -LiteralPath $directory.FullName -File -Recurse |
      Where-Object { $_.Extension -match $imagePattern })
    $covers = @($images | Where-Object { $_.BaseName -like '*选定此张作为封面*' })
    $isHundredCrafts = $directory.Name -eq '百企百匠进校园系列活动'
    if ($isHundredCrafts) {
      $covers = @($covers | Where-Object Name -eq '选定此张作为封面_看图王.png')
    }
    if ($covers.Count -ne 1) { throw "项目 [$($directory.Name)] 需要且只能有一张 [选定此张作为封面] 图片，当前为 $($covers.Count) 张。" }
    $details = if ($isHundredCrafts) {
      @($images | Where-Object Name -like '*_看图王.png' | Sort-Object { if ($_.Name -like '选定此张作为封面*') { '01' } else { '02' } })
    } else {
      @($images | Where-Object FullName -ne $covers[0].FullName | Sort-Object { Get-NaturalKey $_.Name }, FullName)
    }
    $projects += [pscustomobject]@{
      Group = $Group
      Index = $index + 1
      Slug = ('project-{0:d2}' -f ($index + 1))
      Name = $directory.Name.Replace('方案', '')
      Year = if ($directory.Name -match '(20\d{2})') { $Matches[1] } else { 'EVENT' }
      CoverSource = $covers[0].FullName
      DetailSources = $details
    }
  }
  $projects
}

function Write-ProjectSet($Projects, [string]$Group, [string]$BackHref, [string]$BackLabel) {
  $groupAssetRoot = Join-Path $assetRoot $Group
  $groupPageRoot = Join-Path $pageRoot $Group
  New-Item -ItemType Directory -Force -Path $groupAssetRoot, $groupPageRoot | Out-Null
  for ($index = 0; $index -lt $Projects.Count; $index++) {
    $project = $Projects[$index]
    $assetDirectory = Join-Path $groupAssetRoot $project.Slug
    $pageDirectory = Join-Path $groupPageRoot $project.Slug
    New-Item -ItemType Directory -Force -Path $assetDirectory, $pageDirectory | Out-Null
    Save-Cover $project.CoverSource (Join-Path $assetDirectory 'cover.jpg')

    $gallery = [Text.StringBuilder]::new()
    for ($detailIndex = 0; $detailIndex -lt $project.DetailSources.Count; $detailIndex++) {
      $source = $project.DetailSources[$detailIndex]
      $destinationName = 'detail-{0:d3}.jpg' -f ($detailIndex + 1)
      $destinationPath = Join-Path $assetDirectory $destinationName
      if ($source.Extension -ieq '.png') {
        Save-Cover $source.FullName $destinationPath 4096 92
      } else {
        Copy-Item -LiteralPath $source.FullName -Destination $destinationPath -Force
      }
      $dimensions = Get-ImageDimensions $destinationPath
      $loading = if ($detailIndex -eq 0) { 'eager' } else { 'lazy' }
      $priority = if ($detailIndex -eq 0) { ' fetchpriority="high"' } else { '' }
      $alt = Encode-Html "$($project.Name) 活动设计第 $($detailIndex + 1) 页"
      [void]$gallery.AppendLine("      <figure class=`"project-frame`"><img src=`"../../../../assets/projects/event/$Group/$($project.Slug)/$destinationName`" alt=`"$alt`" width=`"$($dimensions.Width)`" height=`"$($dimensions.Height)`" loading=`"$loading`" decoding=`"async`"$priority /></figure>")
    }

    $previous = $Projects[($index - 1 + $Projects.Count) % $Projects.Count]
    $next = $Projects[($index + 1) % $Projects.Count]
    $name = Encode-Html $project.Name
    $previousName = Encode-Html $previous.Name
    $nextName = Encode-Html $next.Name
    $position = '{0:d2} / {1:d2}' -f ($index + 1), $Projects.Count
    $html = @"
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#050505" />
    <meta name="description" content="$name 活动设计项目完整展示" />
    <title>$name｜活动设计项目</title>
    <link rel="stylesheet" href="../../../../event-project.css?v=20260719-nav1" />
  </head>
  <body>
    <a class="skip-link" href="#project-content">跳到项目内容</a>
    <nav class="project-topbar" aria-label="项目导航">
      <a class="project-back" href="$BackHref"><span aria-hidden="true">←</span> $BackLabel</a>
      <span class="project-position">$position</span>
    </nav>
    <header class="project-header">
      <p class="project-kicker">EVENT DESIGN / $('{0:d2}' -f ($index + 1))</p>
      <h1>$name</h1>
      <p class="project-meta">$($project.DetailSources.Count) 张设计展示</p>
    </header>
    <main class="project-gallery" id="project-content">
$($gallery.ToString().TrimEnd())
    </main>
    <nav class="project-pagination" aria-label="相邻项目">
      <a href="../$($previous.Slug)/index.html"><span>上一个项目</span><b>$previousName</b></a>
      <a href="../$($next.Slug)/index.html"><span>下一个项目</span><b>$nextName</b></a>
    </nav>
  </body>
</html>
"@
    [IO.File]::WriteAllText((Join-Path $pageDirectory 'index.html'), $html, $utf8)
  }
}

$featured = @(Get-Projects $FeaturedSource 'featured')
$archive = @(Get-Projects $ArchiveSource 'archive')
Write-ProjectSet $featured 'featured' '../../../../index.html#event' '返回活动设计'
Write-ProjectSet $archive 'archive' '../../index.html' '返回更多案例'

$archiveCards = [Text.StringBuilder]::new()
for ($index = 0; $index -lt $archive.Count; $index++) {
  $project = $archive[$index]
  $name = Encode-Html $project.Name
  [void]$archiveCards.AppendLine("      <a class=`"archive-card`" href=`"./archive/$($project.Slug)/index.html`" aria-label=`"查看 $name 项目详情`">")
  [void]$archiveCards.AppendLine("        <img src=`"../../assets/projects/event/archive/$($project.Slug)/cover.jpg?v=20260717-cover2`" alt=`"$name 活动设计封面`" loading=`"lazy`" decoding=`"async`" />")
  [void]$archiveCards.AppendLine("        <span class=`"archive-card-copy`"><b class=`"archive-card-index`">$('EVENT / {0:d2}' -f ($index + 1))</b><h2>$name</h2></span>")
  [void]$archiveCards.AppendLine('      </a>')
}

$archiveHtml = @"
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#050505" />
    <meta name="description" content="活动设计更多案例作品集" />
    <title>更多活动设计案例</title>
    <link rel="stylesheet" href="../../event-archive.css?v=20260719-nav1" />
  </head>
  <body>
    <nav class="archive-topbar"><a class="archive-back" href="../../index.html#event">← 返回活动设计</a><span class="archive-index">10 PROJECTS</span></nav>
    <header class="archive-hero"><h1>EVE<span>N</span>T<br />ARCHIVE</h1><p class="archive-hero-copy">从主视觉、空间延展到现场体验，收录更多完整活动设计项目。</p></header>
    <main class="archive-grid">
$($archiveCards.ToString().TrimEnd())
    </main>
  </body>
</html>
"@
New-Item -ItemType Directory -Force -Path $pageRoot | Out-Null
[IO.File]::WriteAllText((Join-Path $pageRoot 'index.html'), $archiveHtml, $utf8)

[pscustomobject]@{
  FeaturedProjects = $featured.Count
  FeaturedDetails = ($featured | ForEach-Object DetailSources | Measure-Object).Count
  ArchiveProjects = $archive.Count
  ArchiveDetails = ($archive | ForEach-Object DetailSources | Measure-Object).Count
} | ConvertTo-Json -Compress
