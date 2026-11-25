# Draws app-icon-192.png and app-icon-512.png to match icon.svg (same shapes on a 512 grid).
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

# Arctic palette, matching icon.svg: a deep ice-blue tile with curved top-left and bottom-right
# corners on the app background, holding a mint dumbbell scaled to 80%.
$dumbbell = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#2EF2C4'))
$tileBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#12324a'))

foreach ($size in 192, 512) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b1218'))
  $g.ScaleTransform($size / 512, $size / 512)
  # Tile from 88 to 424: big 96 curves top-left and bottom-right, small 20 curves elsewhere.
  $tile = New-Object System.Drawing.Drawing2D.GraphicsPath
  $tile.AddArc(88, 88, 192, 192, 180, 90)
  $tile.AddArc(384, 88, 40, 40, 270, 90)
  $tile.AddArc(232, 232, 192, 192, 0, 90)
  $tile.AddArc(88, 384, 40, 40, 90, 90)
  $tile.CloseFigure()
  $g.FillPath($tileBrush, $tile)
  $tile.Dispose()
  # Dumbbell at 80% around the centre (GDI+ applies these in reverse order).
  $g.TranslateTransform(256, 256)
  $g.ScaleTransform(0.8, 0.8)
  $g.TranslateTransform(-256, -256)
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
    $g.FillPath($dumbbell, $path)
    $path.Dispose()
  }
  $g.Dispose()
  $bitmap.Save((Join-Path $PSScriptRoot "app-icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
