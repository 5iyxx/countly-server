/**
* Module rendering views as images
* @module api/utils/render
*/

var puppeteer = require('puppeteer');
var Promise = require('bluebird');
var pathModule = require('path');

/**
 * Function to render views as images
 * @param  {object} options - options required for rendering
 * @param  {string} options.host - the hostname
 * @param  {string} options.token - the login token value
 * @param  {string} options.view - the view to open
 * @param  {string} options.id - the id of the block to capture screenshot of
 * @param  {string} options.savePath - path where to save the screenshot
 * @param  {function} options.cbFn - function called after opening the view
 * @param  {function} options.beforeScrnCbFn - function called just before capturing the screenshot
 * @param  {object} options.dimensions - the dimensions of the screenshot
 * @param  {number} options.dimensions.width - the width of the screenshot
 * @param  {number} options.dimensions.height - the height of the screenshot
 * @param  {number} options.dimensions.padding - the padding value to subtract from the height of the screenshot
 * @param  {number} options.dimensions.scale - the scale(ppi) value of the screenshot
 * @param  {function} cb - callback function called with the error value or the image data
 */
exports.renderView = function(options, cb){
    Promise.coroutine(function * (){
        var browser = yield puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        var page = yield browser.newPage();
        
        var host = options.host;
        var token = options.token;
        var view = options.view;
        var id = options.id;
        var path = options.savePath || pathModule.resolve(__dirname, "../../frontend/express/public/images/screenshots/" + "screenshot_" + Date.now() + ".png");
        var cbFn = options.cbFn || function(){};
        var beforeScrnCbFn = options.beforeScrnCbFn || function(){};
        
        options.dimensions = {
            width: options.dimensions && options.dimensions.width ? options.dimensions.width : 1366,
            height: options.dimensions && options.dimensions.height ? options.dimensions.height : 0,
            padding: options.dimensions && options.dimensions.padding ? options.dimensions.padding : 0,
            scale: options.dimensions && options.dimensions.scale ? options.dimensions.scale : 2
        }

        yield page.goto(host + '/login/token/'+token);    
    
        yield page.waitFor(1 * 1000);
    
        yield page.goto(host + view);
    
        yield page.waitFor(5 * 1000);
            
        yield page.evaluate(cbFn);
        
        yield page.waitFor(2 * 1000);

        yield page.setViewport({width: parseInt(options.dimensions.width), height: parseInt(options.dimensions.height), deviceScaleFactor: options.dimensions.scale});
    
        yield page.waitFor(2 * 1000);
        
        var bodyHandle = yield page.$('body');
        var dimensions = yield bodyHandle.boundingBox();
        
        yield page.setViewport({width: parseInt(options.dimensions.width || dimensions.width), height: parseInt(dimensions.height - options.dimensions.padding), deviceScaleFactor: options.dimensions.scale});

        yield page.waitFor(2 * 1000);

        yield page.evaluate(beforeScrnCbFn);

        yield page.waitFor(2 * 1000);

        var image = "";
        if(id){
            var rect = yield page.evaluate(function(selector){
                var element = document.querySelector(selector);
                var dimensions = element.getBoundingClientRect();
                return {left: dimensions.x, top: dimensions.y, width: dimensions.width, height: dimensions.height, id: element.id};
            }, id)
        
            var clip = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };

            image = yield page.screenshot({
                path: path,
                clip: clip,
                type: 'png'
            });
        }else{
            image = yield page.screenshot({
                path: path,
                type: 'png'
            });
        }

        yield bodyHandle.dispose();
        yield browser.close();
        
        var imageData = {
            image: image,
            path: path
        }
        
        return imageData;
    })().then(function(response){
        if(cb){
            return cb(null, response);
        }
    }, function(err){
        if(cb){
            console.log("Headless chrome error: ", err.message);
            return cb(err);
        }
    });
}