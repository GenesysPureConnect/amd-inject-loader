var loaderUtils = require('loader-utils');

module.exports = function( input ) {
	var finalDependencies;

	this.cacheable();
	var baseOptions = loaderUtils.getOptions(this) || {};
	var options = baseOptions.amdInjectLoader || {};
	var istanbul = options.istanbul === true;
	var stripComments = options.stripComments === true;

	// Match AMD define and function
	var rCapture = /(^|;)\s*define\((?:[ ]?[^,]*,)?[ ]?(\[[\s\S]*?\]),[ ]?function[ ]?\(([^)]+)?\)[ ]?{/m;

	var matched = rCapture.exec( input );

	if ( !matched ) {
		throw new Error( "The amd-inject-loader only supports AMD files with dependencies." );
	}
	var rawDependencies = matched[ 2 ];

	if ( stripComments ) {
		rawDependencies = rawDependencies.replace(/\/\/.+/ig, '');
	}

	try {
		finalDependencies = JSON.parse( rawDependencies.replace( /'/g, "\"" ) );
	} catch (e) {
		throw new Error( "JSON parsing failed in amd-inject-loader." );
	}
	var args = ( matched[ 3 ] || "" ).trim().split( /,[ ]?/g );

	var injectorCode = [];

	// Build list of CommonJS style require statements
	finalDependencies.forEach( function( dep, index ) {
		var arg = args[ index ];
		if ( istanbul ) {
			injectorCode.push( "/* istanbul ignore next - the following line of code is used for dependency injection */" );
		}
		if ( !arg ) {
			injectorCode.push( "( injections && injections.hasOwnProperty(\"" + dep + "\") ) || require( \"" + dep + "\" );" );
		} else {
			injectorCode.push( "var " + arg + " = ( injections && injections.hasOwnProperty(\"" + dep + "\") ) ? injections[\"" + dep + "\"] : require( \"" + dep + "\" );" );
		}
	} );

	// Swap out define call with new injection style
	input = input.replace( rCapture, matched[1] + "module.exports = ( function ( injections ) { \n\t" + injectorCode.join( "\n\t" ) );

	return input;
};
