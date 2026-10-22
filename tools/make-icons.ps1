param([string]$OutDir = '.')
# ASCII only. PowerShell 5.1 reads UTF-8 without BOM as ANSI and breaks line endings.
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $OutDir | Out-Null

function RoundRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $d = [single]($r * 2)
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x, $y, $d, $d, [single]180, [single]90)
  $p.AddArc([single]($x + $w - $d), $y, $d, $d, [single]270, [single]90)
  $p.AddArc([single]($x + $w - $d), [single]($y + $h - $d), $d, $d, [single]0, [single]90)
  $p.AddArc($x, [single]($y + $h - $d), $d, $d, [single]90, [single]90)
  $p.CloseFigure()
  return $p
}

function New-Icon([int]$size, [string]$path, [bool]$rounded, [double]$scale) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # background: green gradient
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $c1 = [System.Drawing.Color]::FromArgb(255, 74, 150, 108)
  $c2 = [System.Drawing.Color]::FromArgb(255, 36, 88, 62)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, ([single]45)
  if ($rounded) { $g.FillPath($bg, (RoundRect 0 0 $size $size ($size * 0.22))) }
  else { $g.FillRectangle($bg, $rect) }

  # white card
  [single]$s = $size * $scale
  [single]$cw = $s * 0.78
  [single]$ch = $s * 0.86
  [single]$cx = ($size - $cw) / 2
  [single]$cy = ($size - $ch) / 2
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.FillPath($white, (RoundRect $cx $cy $cw $ch ($s * 0.09)))

  # text lines on the card
  $green = New-Object System.Drawing.SolidBrush $c2
  $pale = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 168, 200, 182))
  [single]$lx = $cx + $cw * 0.16
  [single]$lw = $cw * 0.68
  [single]$lh = [Math]::Max(2, $ch * 0.075)
  [single]$gap = $ch * 0.155
  [single]$ly = $cy + $ch * 0.20
  $g.FillRectangle($green, $lx, $ly, [single]($lw * 0.62), $lh)
  $g.FillRectangle($pale, $lx, [single]($ly + $gap), $lw, $lh)
  $g.FillRectangle($pale, $lx, [single]($ly + $gap * 2), [single]($lw * 0.85), $lh)
  $g.FillRectangle($pale, $lx, [single]($ly + $gap * 3), $lw, $lh)

  # check mark at the bottom right of the card
  [single]$kx = $cx + $cw * 0.52
  [single]$ky = $cy + $ch * 0.70
  [single]$k = $ch * 0.20
  $pen = New-Object System.Drawing.Pen $c2, ([single]([Math]::Max(2, $k * 0.34)))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLines($pen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($kx, [single]($ky + $k * 0.45)),
    [System.Drawing.PointF]::new([single]($kx + $k * 0.42), [single]($ky + $k * 0.92)),
    [System.Drawing.PointF]::new([single]($kx + $k * 1.22), $ky)
  ))

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose(); $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 (Join-Path $OutDir 'icon-192.png') $true 0.86
New-Icon 512 (Join-Path $OutDir 'icon-512.png') $true 0.86
New-Icon 512 (Join-Path $OutDir 'icon-maskable-512.png') $false 0.62
New-Icon 180 (Join-Path $OutDir 'apple-touch-icon.png') $false 0.84
Get-ChildItem $OutDir -Filter *.png | Select-Object Name, Length
