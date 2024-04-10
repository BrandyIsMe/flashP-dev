'use strict';



function isObject(params) {
    return Object.prototype.toString.call(params) === '[object Object]'
}


module.exports = {
    isObject
};
