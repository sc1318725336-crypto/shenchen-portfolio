param([string]$Source='G:\作品集\作品\空间设计',[string]$Root=(Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Drawing; $utf8=[Text.UTF8Encoding]::new($false)
function HE($v){[Net.WebUtility]::HtmlEncode($v)}
function K($v){[regex]::Replace($v,'\d+',{param($m)$m.Value.PadLeft(12,'0')})}
function J($s,$d,$max=4096,$q=92){
  $i=[Drawing.Image]::FromFile($s);$z=[Math]::Min([double]1,[double]$max/[Math]::Max($i.Width,$i.Height))
  $w=[Math]::Max(1,[int]($i.Width*$z));$h=[Math]::Max(1,[int]($i.Height*$z));$b=[Drawing.Bitmap]::new($w,$h);$g=[Drawing.Graphics]::FromImage($b)
  try{$g.Clear('White');$g.InterpolationMode='HighQualityBicubic';$g.DrawImage($i,0,0,$w,$h);$c=[Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|? MimeType -eq 'image/jpeg'|select -First 1;$e=[Drawing.Imaging.EncoderParameters]::new(1);$e.Param[0]=[Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality,[long]$q);$b.Save($d,$c,$e)}
  finally{$g.Dispose();$b.Dispose();$i.Dispose()}
}
$projects=@()
foreach($year in @(Get-ChildItem -LiteralPath $Source -Directory)){foreach($dir in @(Get-ChildItem -LiteralPath $year.FullName -Directory)){
  $images=@(Get-ChildItem -LiteralPath $dir.FullName -File -Recurse|? Extension -match '^\.(png|jpe?g|webp|gif|avif)$')
  $covers=@($images|? BaseName -like '*选定此张作为封面*');if(!$covers){continue};if($covers.Count-ne1){throw "$($dir.Name) 指定封面数量异常"}
  $projects+=[pscustomobject]@{Slug=('project-{0:d2}'-f($projects.Count+1));Name=$dir.Name;Year=$year.Name;Cover=$covers[0];Details=@($images|? FullName -ne $covers[0].FullName|sort {K $_.Name},FullName)}
}}
$assets=Join-Path $Root 'assets\projects\space';$pages=Join-Path $Root 'projects\space';New-Item -ItemType Directory -Force $assets,$pages|Out-Null
for($x=0;$x-lt$projects.Count;$x++){
  $p=$projects[$x];$ad=Join-Path $assets $p.Slug;$pd=Join-Path $pages $p.Slug;New-Item -ItemType Directory -Force $ad,$pd|Out-Null;J $p.Cover.FullName (Join-Path $ad 'cover.jpg') 1800 88;$gallery=''
  for($y=0;$y-lt$p.Details.Count;$y++){$f=$p.Details[$y];$file='detail-{0:d3}.jpg'-f($y+1);$dest=Join-Path $ad $file;if($f.Extension-match'^\.jpe?g$'){Copy-Item -LiteralPath $f.FullName -Destination $dest -Force}else{J $f.FullName $dest};$im=[Drawing.Image]::FromFile($dest);$w=$im.Width;$h=$im.Height;$im.Dispose();$loading=if($y){'lazy'}else{'eager'};$alt=HE "$($p.Name) 空间设计第 $($y+1) 页";$gallery+="<figure class=`"project-frame`"><img src=`"../../../assets/projects/space/$($p.Slug)/$file`" alt=`"$alt`" width=`"$w`" height=`"$h`" loading=`"$loading`" decoding=`"async`"></figure>"}
  $prev=$projects[($x-1+$projects.Count)%$projects.Count];$next=$projects[($x+1)%$projects.Count];$name=HE $p.Name;$pn=HE $prev.Name;$nn=HE $next.Name;$pos='{0:d2} / {1:d2}'-f($x+1),$projects.Count
  $html="<!doctype html><html lang=`"zh-CN`"><head><meta charset=`"UTF-8`"><meta name=`"viewport`" content=`"width=device-width,initial-scale=1`"><title>$name｜空间设计项目</title><link rel=`"stylesheet`" href=`"../../../space-project.css?v=20260719-nav1`"></head><body><a class=`"skip-link`" href=`"#project-content`">跳到项目内容</a><nav class=`"project-topbar`"><a class=`"project-back`" href=`"../../../index.html#space`"><span>←</span> 返回空间设计</a><span class=`"project-position`">$pos</span></nav><header class=`"project-header`"><p class=`"project-kicker`">SPACE DESIGN / $('{0:d2}'-f($x+1))</p><h1>$name</h1><p class=`"project-meta`">$($p.Year) · $($p.Details.Count) 张设计展示</p></header><main class=`"project-gallery`" id=`"project-content`">$gallery</main><nav class=`"project-pagination`"><a href=`"../$($prev.Slug)/index.html`"><span>上一个项目</span><b>$pn</b></a><a href=`"../$($next.Slug)/index.html`"><span>下一个项目</span><b>$nn</b></a></nav></body></html>"
  [IO.File]::WriteAllText((Join-Path $pd 'index.html'),$html,$utf8)
}
[pscustomobject]@{Projects=$projects.Count;Details=($projects|% Details|Measure-Object).Count}|ConvertTo-Json -Compress
