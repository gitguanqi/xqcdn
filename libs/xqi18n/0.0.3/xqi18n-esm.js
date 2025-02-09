function xqi18n ({
    lang,
    messages
}) {
    if (!lang || '') {
        throw new Error('Translate Warn: lang cannot be empty!');
    }
    if (typeof lang != 'string') {
        throw new TypeError('Translate Warn: lang must be a string!');
    }
    if (typeof messages != 'object') {
        throw new TypeError('Translate Warn: messages must be a object!');
    }

    this.lang = lang;
    this.messages = messages;
    this.tns = (key) => {
        return this.translateFn(key);
    };
}

xqi18n.prototype.translateFn = function (key) {
    if (!key) {
        throw new Error('Translate Warn: key cannot be empty!');
    }

    if (typeof key != 'string') {
        throw new TypeError('Translate Warn: key must be a string!');
    }

    let result = '';
    let msgs = this.messages[this.lang];
    let isObj = key.indexOf('.');
    let keys = isObj == -1 ? [key] : key.split('.');

    if (!(msgs[keys[0]])) {
        throw new TypeError('Translate Warn: key does not exist!');
    }
    
    result = isObj == -1 ? msgs[keys[0]] : msgs[keys[0]][keys[1]];

    if (isObj != -1 && keys.length > 2) {
        result = msgs[keys[0]][keys[1]][keys[2]];
    }

    return result;
}

export default xqi18n;