import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import nodeResolve from 'rollup-plugin-node-resolve';
import { minify } from 'uglify-js';

export default {
  // tell rollup our main entry point
    entry: 'source/index',
    dest: 'dist/svg-to-geojson.min.js',
    plugins: [
        nodeResolve({
            jsnext: true,
        }),
        babel(),
        uglify({}, minify),
    ],
    external: [],
    format: 'iife',
    moduleName: 'svgtogeojson',
};
