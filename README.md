# SVG to GeoJson

Converts shapes from an SVG file present in the DOM, into a javascript GeoJSON Object.

## Reference

```
svgtogeojson.svgToGeoJson(ArrayOfBounds, SVGNode, CurveComplexity)
```

**ArrayOfBounds**: An Array containing two items, each as Arrays of Lat/Lng points corresponding to North East and South West Lat/Lng points over which you want your SVG to be placed on a map.
For example, `[[51.60351870425863, 0.207366943359375], [51.342623007528246, -0.46829223632812494]]` would be the (rough) bounds for projecting an SVG over Greater London. [See on map](http://geojson.io/#data=data:application/json,%7B%22type%22%3A%22FeatureCollection%22%2C%22features%22%3A%5B%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B0.207366943359375%2C51.60351870425863%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-0.46829223632812494%2C51.342623007528246%5D%7D%7D%5D%7D)

**SVGNode**: A DOM object for an SVG. This could be found somewhere on the page, or loaded via an async request, or raw SVG code e.g `jQuery('<svg></svg>')[0]`

**CurveComplexity**: An Integer corresponding to the number of straight-light segments a curve will be broken into. GeoJSON has no support for true circles, so `svgToGeoJson` converts curves into polygons with N straight sides. How many sides is controlled by `CurveComplexity`. Providing the value `3` would mean a curve is broken into 3 sections. Note that SVG Circles are defined as 4 joined curves, so a `CurveComplexity` of `3` would result in a circle that was in fact comprised of 12 facets.

Note that providing `ArrayOfBounds` with values that would change the native height/width of the SVG **will** result in the resulting GeoJSON points being stretched.

## Usage

1. Link `svg-to-geojson.min.js` as a `<script>` tag in your HTML
2. Find the NE/SW points of your insertion area using a tool such as [geojson.io](http://geojson.io)
3. Add an SVG from the DOM, or generate/insert one
4. Run the following

```js
var geoJson = svgtogeojson.svgToGeoJson(
  [[51.60351870425863, 0.207366943359375], [51.342623007528246, -0.46829223632812494]]
  document.getElementById('mysvg'),
  3
);
```
