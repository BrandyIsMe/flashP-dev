'use strict';

module.exports = formatPath;
const path = require('path');
function formatPath(p) {
    if (p) {
        const sep = path.sep

        if (sep === '/') {
            return p
        }else {
            return p.replace(/\\/g, '/')
        }
    }

    return p
}
