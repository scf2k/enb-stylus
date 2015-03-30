/**
 * css-stylus
 * ==========
 *
 * Собирает *css*-файлы вместе со *styl*-файлами по deps'ам, обрабатывает инклуды и ссылки, сохраняет в виде `?.css`.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию `?.css`.
 * * *Object* **variables** — Дополнительные переменные окружения для `stylus`.
 * * *String* **filesTarget** — files-таргет, на основе которого получается список исходных файлов
 *   (его предоставляет технология `files`). По умолчанию — `?.files`.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTech(require('enb-stylus/techs/css-stylus'));
 * ```
 */
var fs = require('fs'),
    vow = require('vow'),
    postcss = require('postcss'),
    atUrl = require('postcss-url'),
    atImport = require('postcss-import'),
    stylus = require('stylus');

module.exports = require('enb/techs/css').buildFlow()
    .name('css-stylus')
    .target('target', '?.css')
    .defineOption('variables')
    .defineOption('includes')
    .defineOption('compress', false)
    .defineOption('comments', true)
    .defineOption('prefix', '')
    .defineOption('hoist', false)
    .defineOption('include', true)
    .defineOption('inline', false)
    .defineOption('resolve', true)
    .useFileList(['css', 'styl'])
    .builder(function (sourceFiles) {
        var node = this.node,
            filename = node.resolvePath(this._target),
            variables = this._variables,
            includes = this._includes,
            opts = {
                comments: this._comments,
                compress: this._compress,
                prefix: this._prefix,
                hoist: this._hoist,
                inline: this._inline,
                include: this._include,
                resolve: this._resolve
            },
            defer = vow.defer(),
            css, renderer;

        css = sourceFiles.length === 1 ?
            fs.readFileSync(sourceFiles[0].fullname, 'utf-8') :
            sourceFiles.map(function (file) {
                var url = node.relativePath(file.fullname);

                if (file.name.indexOf('.styl') !== -1 && opts.comments) {
                    return '/* ' + url + ':begin */\n' +
                        '@import "' + url + '";\n' +
                        '/* ' + url + ':end */\n';
                } else {
                    return '@import "' + url + '";';
                }
            }).join('\n');

        renderer = stylus(css, {
                compress: opts.compress,
                prefix: opts.prefix
            })
            .set('hoist atrules', opts.hoist)
            .set('filename', filename);

        if (variables) {
            Object.keys(variables).forEach(function (key) {
                renderer.define(key, variables[key]);
            });
        }

        if (includes) {
            includes.forEach(function (val) {
                renderer.include(val);
            });
        }

        if (opts.inline) {
            renderer.define('url', stylus.url());
        }

        if (opts.resolve || opts.include) {
            renderer
                .set('resolve url', true)
                .define('url', stylus.resolver());
        }

        this._configureRenderer(renderer)
            .render(function (err, css) {
                if (err) {
                    defer.reject(err);
                } else {
                    defer.resolve(css);
                }
            });

        return defer.promise()
            .then(function (css) {
                if (opts.include) {
                    return postcss()
                        .use(atImport({
                            transform: opts.comments && function (content, filename) {
                                var url = node.relativePath(filename),
                                    pre = '/* ' + url + ': begin */ /**/\n',
                                    post = '/* ' + url + ': end */ /**/\n',
                                    res = pre + content + post;

                                return res.replace(/\n/g, '\n    ');
                            }
                        }))
                        .use(atUrl({
                            url: opts.inline ? 'inline' : 'rebase'
                        }))
                        .process(css, {
                            from: filename
                        })
                        .css;
                }

                return css;
            });
    })
    .methods({
        _configureRenderer: function (renderer) {
            return renderer;
        }
    })
    .createTech();
