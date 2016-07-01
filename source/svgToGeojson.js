/**
 * Reduces the complexity of C commands in an SVG path, by turning it into
 * several L commands. Sample rate configurable with the 'complexity' param.
 * @param  {PathSegList Array} pathSegList: an array of Normalized Path Segments,
 *                             				created by path.getPathData()
 * @param  {int} complexity: the number of samples that will be taken along
 *                           each curve.
 * @return {Polygon Node}
 */
function reducePathSegCurveComplexity(pathSegList, complexity) {
    var newSegs = [];
    var lastSeg;

    // Loop through segments, processing each
    pathSegList.forEach(function (seg) {
        var tmpPath;
        var tmpPathLength;
        var lengthStep;
        var d;
        var len;
        var point;

        if (seg.type === 'C') {
            /**
             * Create new isolate path element with only this C (and a starting M) present,
             * so we only need to divide the curve itself (not whole svg's path)
             * into lines
             */
            tmpPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            tmpPath.setAttribute('d', 'M' + lastSeg.values.slice(-2).join(',')
                + 'C' + seg.values.join(','));

            /**
             * step along its length at the provided sample rate, finding
             * the x,y at each point, creating an L command for each.
             */
            tmpPathLength = Math.ceil(tmpPath.getTotalLength());
            lengthStep = Math.ceil(tmpPathLength / complexity);

            // Can't do anything with zero-length curves
            if (!tmpPathLength || !lengthStep) return;

            for (d = lengthStep, len = tmpPathLength; d <= len; d += lengthStep) {
                point = tmpPath.getPointAtLength(d);

                newSegs.push({
                    type: 'L',
                    values: [
                        point.x,
                        point.y
                    ]
                });
            }

            /**
             * Lastly, add an L at the final coords: We've divided a curve into N
             * items, sampling at each N along the length, but the loop ends
             * before it gets to the final point.
             *
             * The Normalized C command object provides these target coords
             * in 'values' positions 4 and 5.
             */
            newSegs.push({
                type: 'L',
                values: [
                    seg.values[4],
                    seg.values[5]
                ]
            });
        } else {
            // We don't care about non-curve commands.
            newSegs.push(seg);
        }

        /**
         * Record the segment just passed so its values can be used in determining
         * starting position of the next seg
         */
        lastSeg = seg;
    });

    return newSegs;
}


/**
 * Return Width and Height dimensions from provided SVG file
 * @param  {[type]} svgNode
 * @return {Object}
 */
function getSVGDimensions(svgNode) {
    var viewBox;
    var wh;
    var w;
    var h;

    // Check for width/height attrs
    w = parseInt(svgNode.getAttribute('width'), 10);
    h = parseInt(svgNode.getAttribute('height'), 10);

    // Fall back on viewBox
    if (typeof w !== 'number' || isNaN(w) || typeof h !== 'number' || isNaN(w)) {
        viewBox = svgNode.getAttribute('viewBox');

        if (!viewBox || typeof viewBox.replace(/^0-9/g, '') !== 'number') return false;

        wh = viewBox.split(/\s+/);
        w = wh[2];
        h = wh[3];
    }

    return { width: w, height: h };
}

/**
 * Converts SVG Path and Rect elements into a GeoJSON FeatureCollection
 * @param  {Leafet LatLngBounds object} bounds
 * @param  {DOM Node} svgNode
 * @return {GeoJson}
 */
function svgToGeoJson(bounds, svgNode) {
    var geoJson = {
        type: 'FeatureCollection',
        features: []
    };

    // Split bounds into nw/se to create d3 scale of NESW maximum values
    var nw = bounds.getNorthWest();
    var se = bounds.getSouthEast();

    var mapX = d3.scale.linear().range([parseFloat(nw.lng), parseFloat(se.lng)]);
    var mapY = d3.scale.linear().range([parseFloat(nw.lat), parseFloat(se.lat)]);
    var svgDims = getSVGDimensions(svgNode);
    var elems = svgNode.querySelectorAll('path, rect, polygon, circle, ellipse, polyline');

    // Set SVG's width/height as d3 scale's domain,
    mapX.domain([0, svgDims.width]);
    mapY.domain([0, svgDims.height]);

    elems.forEach(function (elem) {
        var mappedCoords = [];
        var coords;

        /**
         * Normalize element path: get path in array of X/Y absolute coords.
         * This uses a polyfill for SVG 2 getPathData() which was recently
         * taken out of Chrome, with no replacement.
         *
         * We also reduce its complexity, converting curves (C) into Lines (L)
         * with a complexity factor (second param) dictating how many lines
         * each curve should be converted to.
         */
        var pathData = reducePathSegCurveComplexity(elem.getPathData({ normalize: true }), 5);

        coords = pathData.map(function (pathitem) {
            if (pathitem.type === 'Z') {
                /**
                 * If Close Path command found, copy first pathData value
                 * into last position, as per GeoJSON requirements for
                 * closed polygons.
                 */
                return [pathData[0].values[0], pathData[0].values[1]];
            }

            return [pathitem.values[0], pathitem.values[1]];
        });

        coords.forEach(function (coord) {
            // Map points onto d3 scale
            mappedCoords.push([
                mapX(coord[0]),
                mapY(coord[1])
            ]);
        });

        geoJson.features.push({
            type: 'Feature',
            properties: {
                name: 'test'
            },
            geometry: {
                type: (elem.tagName === 'polyline') ? 'LineString' : 'Polygon',
                coordinates: (elem.tagName === 'polyline') ? mappedCoords : [mappedCoords]
            }
        });
    });

    return geoJson;
}
