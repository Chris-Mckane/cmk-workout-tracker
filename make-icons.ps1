# Draws icon-192.png and icon-512.png to match icon.svg (same shapes on a 512 grid).
# Run from Windows PowerShell:  powershell -ExecutionPolicy Bypass -File make-icons.ps1
Add-Type -AssemblyName System.Drawing

# x, y, width, height, corner radius: keep in step with icon.svg
$shapes = @(
  @(106, 196, 36, 120, 10),
  @(146, 166, 40, 180, 10),
  @(180, 240, 152, 32, 0),
  @(326, 166, 40, 180, 10),
  @(370, 196, 36, 120, 10)
)

foreach ($size in 192, 512) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#14532d'))
  $g.ScaleTransform($size / 512, $size / 512)
  foreach ($shape in $shapes) {
    $x, $y, $w, $h, $r = $shape
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    if ($r -eq 0) {
      $path.AddRectangle((New-Object System.Drawing.Rectangle $x, $y, $w, $h))
    } else {
      $d = 2 * $r
      $path.AddArc($x, $y, $d, $d, 180, 90)
      $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
      $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
      $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
      $path.CloseFigure()
    }
    $g.FillPath([System.Drawing.Brushes]::White, $path)
    $path.Dispose()
  }
  $g.Dispose()
  $bitmap.Save((Join-Path $PSScriptRoot "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
