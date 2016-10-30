import { scaleLinear } from 'd3-scale';
import '../node_modules/path-data-polyfill/path-data-polyfill';

/**
 * Reduces the complexity of C commands in an SVG path, by turning it into
 * several L commands. Sample rate configurable with the 'complexity' param.
 * @param  {PathSegList Array} pathSegList: an array of Normalized Path Segments,
 *                             				created by path.getPathData()
 * @param  {int} complexity: the number of samples that will be taken along
 *                           each curve.
 * @return {Polygon Node}
 */
export function reducePathSegCurveComplexity(pathSegList = [], complexity = 5) {
    const newSegs = [];
    let lastSeg;

    // Loop through segments, processing each
    pathSegList.forEach((seg) => {
        let tmpPath;
        let tmpPathLength;
        let lengthStep;
        let d;
        let len;
        let point;

        if (seg.type === 'C') {
            /**
             * Create new isolate path element with only this C (and a starting M) present,
             * so we only need to divide the curve itself (not whole svg's path)
             * into lines
             */
            tmpPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            const lastSegCoords = lastSeg.values.slice(-2).join(',');

            tmpPath.setAttribute('d', `M ${lastSegCoords}C${seg.values.join(',')}`);

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
                        point.y,
                    ],
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
                    seg.values[5],
                ],
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
export function getSVGDimensions(svgNode) {
    let viewBox;
    let wh;
    let width;
    let height;

    // Check for width/height attrs
    width = parseInt(svgNode.getAttribute('width'), 10);
    height = parseInt(svgNode.getAttribute('height'), 10);

    // Fall back on viewBox
    if (typeof width !== 'number' || isNaN(width) || typeof height !== 'number' || isNaN(height)) {
        viewBox = svgNode.getAttribute('viewBox');

        if (!viewBox || typeof viewBox.replace(/^0-9/g, '') !== 'number') return false;

        wh = viewBox.split(/\s+/);
        width = wh[2];
        height = wh[3];
    }

    return { width, height };
}

/**
 * Converts SVG Path and Rect elements into a GeoJSON FeatureCollection
 * @param  {Array} bounds: Array of lat/lon arrays e.g [[n,e],[s,w]]
 * @param  {DOM Node} svgNode
 * @return {GeoJson Object}
 */
export function svgToGeoJson(bounds, svgNode, complexity = 5, attributes = []) {
    const geoJson = {
        type: 'FeatureCollection',
        features: [],
    };

    // Split bounds into nw/se to create d3 scale of NESW maximum values
    const ne = bounds[0];
    const sw = bounds[1];

    const mapX = scaleLinear().range([parseFloat(sw[1]), parseFloat(ne[1])]);
    const mapY = scaleLinear().range([parseFloat(ne[0]), parseFloat(sw[0])]);
    const svgDims = getSVGDimensions(svgNode);

    // Limit the elements we're interested in. We don't want 'defs' or 'g' for example
    const elems = svgNode.querySelectorAll('path, rect, polygon, circle, ellipse, polyline');

    // Set SVG's width/height as d3 scale's domain,
    mapX.domain([0, svgDims.width]);
    mapY.domain([0, svgDims.height]);

    elems.forEach((elem) => {
        const mappedCoords = [];
        /**
         * Normalize element path: get path in array of X/Y absolute coords.
         * This uses a polyfill for SVG 2 getPathData() which was recently
         * taken out of Chrome, with no replacement.
         *
         * We also reduce its complexity, converting curves (C) into Lines (L)
         * with a complexity factor (second param) dictating how many lines
         * each curve should be converted to.
         */
        const pathData = reducePathSegCurveComplexity(
            elem.getPathData({ normalize: true }), complexity
        );

        const coords = pathData.map((pathitem) => {
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

        coords.forEach((coord) => {
            // Map points onto d3 scale
            mappedCoords.push([
                mapX(coord[0]),
                mapY(coord[1]),
            ]);
        });

        var properties = {};

        attributes.forEach(function (attr) {
            var value = elem.getAttribute(attr);
            if (value)
                properties[attr] = value;
        });

        geoJson.features.push({
            type: 'Feature',
            properties: properties,
            geometry: {
                type: (elem.tagName === 'polyline') ? 'LineString' : 'Polygon',
                coordinates: (elem.tagName === 'polyline') ? mappedCoords : [mappedCoords],
            },
        });
    });

    return geoJson;
}
