require('./lib/mock-require');

var fs = require('fs'),
    path = require('path'),
    mock = require('mock-fs'),
    TestNode = require('enb/lib/test/mocks/test-node'),
    FileList = require('enb/lib/file-list'),
    CssTech = require('../techs/css-stylus'),
    fixturesDirname = path.join(__dirname, 'fixtures', 'stylus', 'test'),
    cases = mockDir(path.join(fixturesDirname, 'cases')),
    images = mockDir(path.join(fixturesDirname, 'images')),
    ignores = [
        'import.include.complex',
        'import.include.function',
        'import.include.in.function',
        'import.include.megacomplex',
        'import.include.resolver.images',
        'require.include',
        'import.include.resolver.absolute'
    ];

addSuite('cases', readDir(fixturesDirname + '/cases', '.styl'), function (test, done) {
    if (ignores.indexOf(test) !== -1) {
        return done();
    }

    var css = readFile(fixturesDirname + '/cases/' + test + '.css'),
        stylFilename = path.join(__dirname, '..', 'node_modules', 'stylus', 'lib', 'functions', 'index.styl'),
        fsScheme = {
            cases: cases,
            images: images
        };

    fsScheme[stylFilename] = readFile(stylFilename);

    mock(fsScheme);

    var node = new TestNode('cases'),
        fileList = new FileList();

    fileList.addFiles([{
        fullname: 'cases/' + test + '.styl',
        name: test + '.styl',
        suffix: 'styl'
    }]);
    node.provideTechData('?.files', fileList);

    node.runTechAndGetContent(
        CssTech, {
            includes: ['images', 'cases/import.basic'],
            comments: false,
            compress: test.indexOf('compress') !== -1,
            prefix: test.indexOf('prefix.') !== -1 && 'prefix-',
            hoist: test.indexOf('hoist.') !== -1,
            include: test.indexOf('include') !== -1,
            resolve: test.indexOf('resolver') !== -1,
            inline: !(test.indexOf('resolver') !== -1 || test.indexOf('include') !== -1)
        }
    ).spread(function (source) {
        source.toString('utf-8').trim().must.eql(css);
        mock.restore();
        done();
    }).fail(function (err) {
        mock.restore();
        done(err);
    });
}, ['index']);

function addSuite(desc, cases, fn, ignore) {
    describe(desc, function () {
        cases.forEach(function (test) {
            var name = normalizeName(test);

            if (ignore && ignore.indexOf(name) !== -1) {
                return;
            }

            it(name, function (done) {
                fn(test, done);
            });
        });
    });
}

function readDir(dir, ext) {
    ext = ext || '.styl';

    return fs.readdirSync(dir).filter(function (file) {
        return file.indexOf(ext) !== -1;
    }).map(function (file) {
        return file.replace(ext, '');
    });
}

function readFile(filename) {
    var ext = path.extname(filename),
        basename = path.basename(filename);

    if (basename === 'gif' || ext === '.gif' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg') {
        return fs.readFileSync(filename);
    }

    return normalizeContent(fs.readFileSync(filename, 'utf-8'));
}

function normalizeName(name) {
    return name.replace(/[-.]/g, ' ');
}

function normalizeContent(str) {
    return str.replace(/\r/g, '').trim();
}

function mockDir(dir) {
    var obj = {};

    function process(obj, root, dir) {
        var dirname = dir ? path.join(root, dir) : root,
            basename = dir || root,
            od = obj[basename] = {};

        fs.readdirSync(dirname).forEach(function (basename) {
            var filename = path.join(dirname, basename),
                stat = fs.statSync(filename);

            if (stat.isDirectory()) {
                process(od, dirname, basename);
            } else {
                od[basename] = readFile(filename);
            }
        });
    }

    fs.readdirSync(dir).forEach(function (basename) {
        var filename = path.join(dir, basename),
            stat = fs.statSync(filename);

        if (stat.isDirectory()) {
            process(obj, dir, basename);
        } else {
            obj[basename] = readFile(filename);
        }
    });

    return obj;
}
