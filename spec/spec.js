var path = require('path');
var fs = require('fs');

require( "should" );
var sinon = require( "sinon" );
var memfs = require('memfs');
var monkey = require('fs-monkey');

var context;

var loader;

function er(fileName) {
    var basename = path.basename(fileName);
    var contents = fs.readFileSync(fileName, 'utf8');
    var resp = loader(contents);

    var memoryfs = memfs.fs;
    monkey.patchRequire(memoryfs);
    memoryfs.writeFileSync('/'+ basename, resp);

    var localInclude = fs.readFileSync('./spec/examples/localInclude.js', 'utf8');
    memoryfs.writeFileSync('/localInclude.js', localInclude);

    return require('/'+ basename);
}

describe( "amd-inject-loader", function() {
    beforeEach(function() {
        context = {
            cacheable: function() { }
        }
        loader = require('../index').bind(context);
    });

    it( "should throw an error when used with incompatible formats", function() {
		( function() {
			er( "./spec/examples/invalid-commonjs.js" );
		} ).should.throw( /files with dependencies/ );

		( function() {
			er( "./spec/examples/invalid-amd.js" );
		} ).should.throw( /files with dependencies/ );

		( function() {
			er( "./spec/examples/validNoArgs.js" );
		} ).should.not.throw();

		( function() {
			er( "./spec/examples/almost-valid-amd.js" );
		} ).should.throw( /JSON parsing failed/ );
	} );

    it( "should transform the file correctly", function() {
        var factory = er( "./spec/examples/simple.js" );
		var resp = factory.toString();

		resp.should.match( /var _ =/ );

		var stub = sinon.stub();

		factory( {
			"lodash": { each: stub }
		} );

		stub.calledOnce.should.be.ok;
		stub.calledWith( [ 1, 2, 3 ] ).should.be.ok;
    });
    
    it( "should transform the file correctly when the module is named", function() {
        var factory = er( "./spec/examples/simpleNamed.js" );
		var resp = factory.toString();

		resp.should.match( /var _ =/ );

		var stub = sinon.stub();

		factory( {
			"lodash": { each: stub }
		} );

		stub.calledOnce.should.be.ok;
		stub.calledWith( [ 1, 2, 3 ] ).should.be.ok;
    } );
    
    it( "should tranform the file correctly even when define is multiline", function() {
		var factory = er( "./spec/examples/multiline.js" );
		var resp = factory.toString();

		resp.should.match( /var _ =/ );

		var stub = sinon.stub();

		factory( {
			"lodash": { each: stub }
		} );

		stub.calledOnce.should.be.ok;
		stub.calledWith( [ 1, 2, 3 ] ).should.be.ok;
    } );

    it( "should tranform the file correctly even when define has comments", function() {
        context.query = {
            amdInjectLoader: {
				stripComments: true
			}
        }
        var factory = er( "./spec/examples/multilineWithComments.js" );
		var resp = factory.toString();

		resp.should.match( /var _ =/ );

		var stub = sinon.stub();

		factory( {
			"lodash": { each: stub },
			"jquery": { each: stub },
			"app/code": { each: stub }
		} );

		stub.calledOnce.should.be.ok;
		stub.calledWith( [ 1, 2, 3 ] ).should.be.ok;
    } );
    
    it( "should allow the factory method to be called without any arguments", function() {
        var factory = er( "./spec/examples/withInclude.js" );
        var resp = factory.toString();

		resp.should.match( /var include =/ );
		factory.should.not.throw();
    } );
    
    it( "should support more dependencies than arguments", function() {
		var factory = er( "./spec/examples/moreDeps.js" );
		var resp = factory.toString();

		resp.should.match( /var _ =/ );
		resp.should.match( /require\( "unreferenced" \)/ );

		factory.bind( this, {
			lodash: { each: sinon.stub() },
			unreferenced: { somethingElse: true }
		} ).should.not.throw();
    } );
    
    it( "should add istanbul ignore comments before each line when turned on", function() {
        context.query = {
            amdInjectLoader: {
				istanbul: true
			}
        }
		var factory = er( "./spec/examples/istanbul.js" );
		var resp = factory.toString();

		var lines = resp.split( /\n/ );
		lines[ 1 ].should.equal( "\t/* istanbul ignore next - the following line of code is used for dependency injection */" );
		lines[ 2 ].should.startWith( "\tvar _ =" );
		lines[ 3 ].should.equal( "\t/* istanbul ignore next - the following line of code is used for dependency injection */" );
		lines[ 4 ].should.startWith( "\tvar React =" );
    } );
    
    it( "should support transformation of istanbul instrumented code", function() {
		var factory = er( "./spec/examples/instrumented.js" );

		var stub = sinon.stub();

		factory( {
			"lodash": { each: stub }
		} );

		stub.calledOnce.should.be.ok;
		stub.calledWith( [ 1, 2, 3 ] ).should.be.ok;
	} );
});