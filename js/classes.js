class Action {
    constructor(name, relateFrom = null, relateTo = null, relateFromAttribute = null, relateToAttribute = null) {
        g_id += 1;
        this.id = g_id;

        this.name = name;

        this.x = 0;
        this.y = 0;

        this.rx = 0;
        this.ry = 0;

        this.relateFrom = null;
        this.relateTo = null;

        this.relateFromAttribute = null;
        this.relateToAttribute = null;

        this.relateFromMany = false;
        this.relateToMany = false;

        this.relateFromOptional = false;
        this.relateToOptional = false;

        this.children = [];

        this.element = null;

        this.relateToLine = null;
        this.relateFromLine = null;
        this.connectedLines = []; // attr.

        if (relateTo) {
            this.setRelateTo(relateTo, relateToAttribute);
        }

        if (relateFrom) {
            this.setRelateFrom(relateFrom, relateFromAttribute);
        }

        if (name != "DUMMY_SAVE_OBJ") {
            g_actions.push(this);
        }
    }

    setRelateTo(entity = null, attribute = null) {
        if (this.relateTo) {
            var index = this.relateTo.relationsFrom.indexOf(this);
            if (index !== -1) this.relateTo.relationsFrom.splice(index, 1);
        }

        this.relateTo = entity;

        if (entity) {
            if (entity.relationsFrom) {
                entity.relationsFrom.push(this);
                if (attribute) {
                    if (attribute.parent == entity) {
                        this.relateToAttribute = attribute;
                    }
                } else {
                    this.relateToAttribute = null;
                }
            }
        }
    }

    setRelateFrom(entity, attribute = null) {
        if (this.relateFrom) {
            var index = this.relateFrom.relationsTo.indexOf(this);
            if (index !== -1) this.relateFrom.relationsTo.splice(index, 1);
        }

        this.relateFrom = entity;

        if (entity) {
            if (entity.relationsTo) {
                entity.relationsTo.push(this);
                if (attribute) {
                    if (attribute.parent == entity) {
                        this.relateFromAttribute = attribute;
                    }
                } else {
                    this.relateFromAttribute = null;
                }
            }
        }
    }

    addChild(elem) {
        this.children.push(elem);
    }

    removeChild(child) {
        var index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
    }

    addAttribute(name) {
        this.children.push(new Attribute(name, this))
    }

    getCardinalityText(side) {
        if (side == "to") {
            return (this.relateToOptional ? "0" : "1") + ".." + (this.relateToMany ? "N" : "1")
        } else {
            return (this.relateFromOptional ? "0" : "1") + ".." + (this.relateFromMany ? "N" : "1")
        }
    }
}

class Attribute {
    constructor(name, parent = null) {
        g_id += 1;
        this.id = g_id;

        this.name = name;
        this.pk = false;
        this.composite = false;
        this.derived = false;
        this.multiValued = false;
        this.optional = false;
        this.dataType = null;
        this.dataLength = null;

        this.x = 0;
        this.y = 0;

        this.rx = 0;
        this.ry = 0;

        this.parent = parent;

        this.element = null;
        this.connectedLines = [];

        if (name != "DUMMY_SAVE_OBJ") {
            g_attributes.push(this);
        }
    }

    setParent(newParent = null) {
        if (!newParent) {
            if (this.parent) {
                this.parent.removeChild(this);
                this.parent = null;
            }
        } else {
            if (this.parent) {
                this.parent.removeChild(this);
            }

            this.parent = newParent;

            if (this.parent) {
                this.parent.addChild(this);
            }
        }
    }
}

class Entity {
    constructor(name) {
        g_id += 1;
        this.id = g_id;

        this.name = name;

        this.x = 0;
        this.y = 0;

        this.rx = 0;
        this.ry = 0;

        this.relationsFrom = [];
        this.relationsTo = [];

        this.children = [];

        this.element = null;
        this.connectedLines = [];

        if (name != "DUMMY_SAVE_OBJ") {
            g_entities.push(this);
        }
    }

    addChild(elem) {
        this.children.push(elem);
    }

    removeChild(child) {
        var index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
    }

    addAttribute(name) {
        this.children.push(new Attribute(name, this))
    }
}

var DataTypes = [
    numeric = ["TINYINT", "SMALLINT", "MEDIUMINT", "BIGINT", "DECIMAL", "FLOAT", "DOUBLE", "BIT"],
    string = ["CHAR", "VARCHAR", "BINARY", "VARBINARY", "TINYBLOB", "BLOB", "MEDIUMBLOB", "LONGBLOB", "TINYTEXT", "TEXT", "MEDIUMTEXT", "LONGTEXT", "ENUM", "SET"],
    date = ["DATE", "TIME", "DATETIME", "TIMESTAMP", "YEAR"],
    spatial = ["GEOMETRY", "POINT", "LINESTRING", "POLYGON", "GEOMETRYCOLLECTION", "MULTILINESTRING", "MULTIPOINT", "MULTIPOLYGON"],
    other = ["JSON"]
]

function getAllDataTypes() {
    var ret = []
    return ret.concat(numeric, string, date, spatial, other)
}

// utf8 Base64 encodehoz es decodehoz min js funkciok
var Base64 = { _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode: function (e) { var t = ""; var n, r, i, s, o, u, a; var f = 0; e = Base64._utf8_encode(e); while (f < e.length) { n = e.charCodeAt(f++); r = e.charCodeAt(f++); i = e.charCodeAt(f++); s = n >> 2; o = (n & 3) << 4 | r >> 4; u = (r & 15) << 2 | i >> 6; a = i & 63; if (isNaN(r)) { u = a = 64 } else if (isNaN(i)) { a = 64 } t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a) } return t }, decode: function (e) { var t = ""; var n, r, i; var s, o, u, a; var f = 0; e = e.replace(/[^A-Za-z0-9\+\/\=]/g, ""); while (f < e.length) { s = this._keyStr.indexOf(e.charAt(f++)); o = this._keyStr.indexOf(e.charAt(f++)); u = this._keyStr.indexOf(e.charAt(f++)); a = this._keyStr.indexOf(e.charAt(f++)); n = s << 2 | o >> 4; r = (o & 15) << 4 | u >> 2; i = (u & 3) << 6 | a; t = t + String.fromCharCode(n); if (u != 64) { t = t + String.fromCharCode(r) } if (a != 64) { t = t + String.fromCharCode(i) } } t = Base64._utf8_decode(t); return t }, _utf8_encode: function (e) { e = e.replace(/\r\n/g, "\n"); var t = ""; for (var n = 0; n < e.length; n++) { var r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r) } else if (r > 127 && r < 2048) { t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128) } else { t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128) } } return t }, _utf8_decode: function (e) { var t = ""; var n = 0; var r = c1 = c2 = 0; while (n < e.length) { r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r); n++ } else if (r > 191 && r < 224) { c2 = e.charCodeAt(n + 1); t += String.fromCharCode((r & 31) << 6 | c2 & 63); n += 2 } else { c2 = e.charCodeAt(n + 1); c3 = e.charCodeAt(n + 2); t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63); n += 3 } } return t } }