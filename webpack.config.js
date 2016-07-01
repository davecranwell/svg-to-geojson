var path = require('path');
var webpack = require('webpack');
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
var env = process.env.WEBPACK_ENV;

var plugins = [];
var outputFile;
var libraryName = 'svg-to-geojson';

if (env === 'build') {
    plugins.push(new UglifyJsPlugin({ minimize: true }));
    outputFile = libraryName + '.min.js';
} else {
    outputFile = libraryName + '.js';
}

module.exports = {
    entry: __dirname + '/source/index.js',
    output: {
        path: __dirname + '/dist',
        filename: outputFile,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                include: path.join(__dirname, 'source'),
                loader: 'babel-loader',
                query: {
                   presets: ["es2015"],  
                }
            }
        ]
    },
    resolve: {
        root: path.resolve('./source'),
        extensions: ['', '.js']
    },
    debug: true,
    plugins: plugins
};