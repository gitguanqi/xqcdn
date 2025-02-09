    // 新增语句生成
    /**
     * 
     * @param {*} table 表名
     * @param {*} params 参数，数组格式
     * @param {*} fields 字段，数组格式
     * @returns 字符串 mysql语句
     */
     const add = (table, params, fields) => {
        let k = '';
        let v = [];
        let s = '';
        let tbs = '`' + table + '`';
        for (let i = 0; i < fields.length; i++) {
            let element = fields[i];
            k += element.value + ',';
        }
        for (const item of params) {
            let vItem = '';
            for (const parItem of fields) {
                let val = item[parItem.value];
                val = typeof val === 'number' ?
                    parseInt(val) :
                    `"${val}"`;
                vItem += val + ',';
            }
            vItem = vItem.slice(0, vItem.length - 1);
            v.push(`(0,${vItem})`);
        }
        k = k.slice(0, k.length - 1);
        v = v.join(',');
        s = `INSERT INTO ${tbs} (id, ${k}) VALUES ${v}`;
        return s;
    }

    // 获取语句
    /**
     * 
     * @param {*} table 表名
     * @param {*} params 参数，对象格式
     * @param {*} mode 模式：默认，多条件，分页类型
     * @param {*} field 表字短，字符串拼接
     * @returns 字符串 mysql语句
     */
    const get = (table, params, mode = 'default', field = '*') => {
        let sql = '';
        let count = '';
        let result = '';
        let tbs = '`' + table + '`';
        let baseSql = `SELECT ${field} FROM ${tbs}`;
        let baseCount = `SELECT COUNT(id) FROM ${tbs}`;
        let likes = ['name', 'user', 'origin_name', 'url'];

        // 默认模式
        if (mode === 'default') {
            let types = {}
            let key = params.key;
            let vals = params.type === 'one' ? params.ids[0] : params.type === 'more' ? params.ids.join(',') : '';
            let type = params.type;
            types.one = `${baseSql} WHERE ${key} = '${vals}'`;
            types.more = `${baseSql} WHERE ${key} in (${vals})`;
            types.all = baseSql;
            sql = types[type];
        }
        // 更多条件模式
        if (mode === 'more') {
            let ifs = '';
            for (const key in params) {
                let v = params[key];
                v = typeof v === 'number' ? parseInt(v) : v;
                if (typeof v === 'string') {
                    v = v.replace(/\"/g, '');
                }
                if (v || v == 0) {
                    if (likes.includes(key)) {
                        ifs += ` ${key} LIKE '%${v}%' AND`;
                    } else {
                        ifs += ` ${key} = '${v}' AND`;
                    }
                }
            }
            ifs = ifs.slice(0, ifs.length - 4);
            sql = `${baseSql} WHERE ${ifs}`;
        }
        // 分页模式
        if (mode === 'page') {
            let ifs = '';
            let pageInfo = '';
            if (params.list) {
                for (const key in params.list) {
                    let v = params.list[key];
                    v = typeof v === 'number' ? parseInt(v) : v;
                    if (v) {
                        if (likes.includes(key)) {
                            ifs += ` ${key} LIKE '%${v}%' AND`;
                        } else {
                            ifs += ` ${key} = '${v}' AND`;
                        }
                    }
                    if (v === 0) {
                        ifs += ` ${key} = 0 AND`;
                    }
                }
                ifs = ifs.slice(0, ifs.length - 4);
            }
            ifs = ifs !== '' ? `WHERE ${ifs}` : '';
            pageInfo = `ORDER by ${params.sorts.name} ${params.sorts.val} LIMIT ${params.limits.page},${params.limits.size}`;
            sql = `${baseSql} ${ifs} ${pageInfo}`;
            count = `${baseCount} ${ifs}`;
        }

        result = mode === 'page' ? {
            sql,
            count
        } : sql;

        return result;
    }

    // 更新语句
    /**
     * 
     * @param {*} table 表名
     * @param {*} params 参数，对象格式
     * @param {*} fields 字段，数组
     * @param {*} mode 模式：单个，多个，所有
     * @returns 字符串 mysql语句
     */
    const up = (table, params, fields, mode = 'one') => {
        let key = params.key;
        let ids = params.ids;
        let list = params.list;
        let vals = ids && ids.length <= 1 ? ids[0] : ids.join(',');
        let upStr = '';
        let tbs = '`' + table + '`';
        for (const item of fields) {
            let k = item.value;
            let v = list[item.value];
            if (k in list &&
                v === '' &&
                item.isMust) {
                return res.json({
                    code: 101,
                    msg: 'save_fail',
                    data: {
                        info: `请填写${item.name}!`,
                    }
                });
            }
            if (k in list &&
                v !== null) {
                v = typeof v === 'number' ?
                    parseInt(v) :
                    `"${v}"`;
                upStr += `${k} = ${v},`;
            }
        }
        upStr = upStr.slice(0, upStr.length - 1);
        let types = {
            'one': `UPDATE ${tbs} SET ${upStr} WHERE ${key} = '${vals}'`,
            'more': `UPDATE ${tbs} SET ${upStr} WHERE ${key} in (${vals})`,
            'all': `UPDATE ${tbs} SET ${upStr}`
        }
        return types[mode];
    }


    // 删除语句
    /**
     * 
     * @param {*} table 表名
     * @param {*} params 参数
     * @param {*} mode 模式：单个，多个，所有
     * @returns 字符串 mysql语句
     */
    const del = (table, params, mode = 'one') => {
        let key = params.key;
        let ids = params.ids;
        let vals = mode == 'one' ? ids[0] : mode == 'more' ? ids.join(',') : '';
        let tbs = '`' + table + '`';
        let types = {
            'one': `DELETE FROM ${tbs} WHERE ${key} = '${vals}'`,
            'more': `DELETE FROM ${tbs} WHERE ${key} in (${vals})`,
            'all': `DELETE FROM ${tbs}`
        }
        return types[mode];
    }

const xqsql = {
    add,
    get,
    up,
    del,
}

export default xqsql;
