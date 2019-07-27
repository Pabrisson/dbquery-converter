window.$ = window.jQuery = require('jquery')
var Split = require('split.js')

var sqlTextArea = document.getElementById('js-code-input-textarea');
var phpTextArea = document.getElementById('js-code-output-textarea');
var codeInput = document.getElementById('js-code-input');
var codeOutput = document.getElementById('js-code-output');

var sqlCodeMirror;
var phpCodeMirror;
var inputCode;

initColorSheme();
initSplitWindows();

$(document).ready(function (){
    sqlCodeMirror.focus();

    $(document).on('click', '.js-code-input-button', function () {
        inputCode = sqlCodeMirror.getDoc().getValue();
        $outputCode = processConvert(inputCode);
        phpCodeMirror.getDoc().setValue($outputCode);
    });
});

function initColorSheme()
{
    sqlCodeMirror = CodeMirror.fromTextArea(sqlTextArea, {
        mode: 'text/x-mysql',
        theme: 'oceanic-next',
        lineNumbers: true,
    });

    phpCodeMirror = CodeMirror.fromTextArea(phpTextArea, {
        mode: 'php',
        theme: 'oceanic-next',
        lineNumbers: true,
        readOnly: true,
        autoRefresh: true
    });
};

function initSplitWindows()
{
    Split([codeInput, codeOutput], {
        sizes: [40, 60],
        onDrag: function() {
            sqlCodeMirror.refresh()
            phpCodeMirror.refresh()
        },
    })
}

function createQuery(queryData)
{
    var arrayQuery = new Array();
    arrayQuery.push('<?php\n');
    arrayQuery.push('$query = new dbQuery();\n')

    $.each(queryData, function(index, value) {
        if (index === 'select') {
            value.forEach(function(selectItem) {
                arrayQuery.push('$query->select(\'' + selectItem + '\');');
            });
        }

        if (index === 'from') {
            var query = '$query->from(\'' + value.table + '\'';
            if (value.alias) {
                query += ', \'' + value.alias + '\'';
            }
            query += ');'

            arrayQuery.push(query);
        }

        if (
            index === 'join' ||
            index === 'leftJoin' ||
            index === 'leftOuterJoin' ||
            index === 'rightJoin' ||
            index === 'innerJoin'
        ) {
            if (value.table && value.restriction) {
                arrayQuery.push(
                    '$query->' + index + '(\n    \'' +
                    value.table + '\', \n    \'' +
                    value.alias + '\', \n    \'' +
                    value.restriction +
                    '\'\n);'
                )
            }
        }

        if (index === 'naturalJoin') {
            if (value.table) {
                arrayQuery.push('$query->naturalJoin(\'' + value.table + '\');');
            }
        }

        if (index === 'where') {
            value.forEach(function(restriction) {
                arrayQuery.push('$query->where(\'' + restriction + '\');');
            });
        }

        if (index === 'groupBy') {
            value.forEach(function(groupByItem) {
                arrayQuery.push('$query->groupBy(\'' + groupByItem + '\');');
            });
        }

        if (index === 'OrderBy') {
            value.forEach(function(orderByItem) {
                arrayQuery.push('$query->orderBy(\'' + orderByItem + '\');');
            });
        }

        if (index === 'having') {
            arrayQuery.push('$query->having(\'' + value + '\');');
        }

        if (index === 'limit') {
            var query = '$query->limit(' + parseInt(value.limit);
            if (value.offset) {
                query += ', ' + value.offset;
            }
            query += ');'

            arrayQuery.push(query);
        }
    });

    arrayQuery.push('\n$res = Db::getInstance()->executeS($query);')

    return arrayQuery.join('\n')
}

function processConvert(inputCode)
{
    var queryData = new Object();

    if (processSelect(inputCode)) {queryData.select = processSelect(inputCode)}
    if (processFrom(inputCode)) {queryData.from = processFrom(inputCode)}
    if (processJoin(inputCode, 'join')) {queryData.join = processJoin(inputCode, 'join')}
    if (processJoin(inputCode, 'leftJoin')) {queryData.leftJoin = processJoin(inputCode, 'leftJoin')}
    if (processJoin(inputCode, 'leftOuterJoin')) {queryData.leftOuterJoin = processJoin(inputCode, 'leftOuterJoin')}
    if (processJoin(inputCode, 'rightJoin')) {queryData.rightJoin = processJoin(inputCode, 'rightJoin')}
    if (processJoin(inputCode, 'innerJoin')) {queryData.innerJoin = processJoin(inputCode, 'innerJoin')}
    if (processJoin(inputCode, 'naturalJoin')) {queryData.naturalJoin = processJoin(inputCode, 'naturalJoin')}
    if (processWhere(inputCode)) {queryData.where = processWhere(inputCode)}
    if (processGroupBy(inputCode)) {queryData.groupBy = processGroupBy(inputCode)}
    if (processHaving(inputCode)) {queryData.having = processHaving(inputCode)}
    if (processOrderBy(inputCode)) {queryData.OrderBy = processOrderBy(inputCode)}
    if (processLimit(inputCode)) {queryData.limit = processLimit(inputCode)}

    return createQuery(queryData);
}

function processSelect(inputCode)
{
    var selectData = new Object();
    var regexSelect = new RegExp('SELECT\\s+((.+?\\s|^)+)FROM', 'gmi');
    var responseSelect = regexSelect.exec(inputCode);

    if (responseSelect) {
        selectData = responseSelect[1].replace(/\n|\r|\s/g, '').split(',');
    } else {
        selectData = responseSelect;
    }

    return selectData;
}

function processFrom(inputCode)
{
    var fromData = new Object();
    var regexOrderBy = new RegExp('FROM\\s`?([0-9,a-z,A-Z$_-]{1,64})`?\\s+(AS\\s(\\w)|\\s+)', 'gmi');
    var responseOrderBy = regexOrderBy.exec(inputCode);

    if (responseOrderBy) {
        fromData.table = responseOrderBy[1].replace('ps_', '');
        if (parseInt(responseOrderBy.length) >= 2) {
            fromData.alias = responseOrderBy[3];
        }
    } else {
        fromData = responseOrderBy;
    }

    return fromData;
}

function processJoin(inputCode, typeJoin)
{
    var joinData = new Object();
    var typeJoinSql = '';

    if (typeJoin === 'join') {typeJoinSql = 'JOIN'};
    if (typeJoin === 'leftJoin') {typeJoinSql = 'LEFT JOIN'};
    if (typeJoin === 'leftOuterJoin') {typeJoinSql = 'LEFT OUTER JOIN'};
    if (typeJoin === 'rightJoin') {typeJoinSql = 'RIGHT JOIN'};
    if (typeJoin === 'innerJoin') {typeJoinSql = 'INNER JOIN'};
    if (typeJoin === 'naturalJoin') {typeJoinSql = 'NATURAL JOIN'};

    if (typeJoin !== 'naturalJoin') {
        var regexJoin = new RegExp('(' + typeJoinSql + ')\\s(.+?)\\s+(JOIN|LEFT\\sJOIN|RIGHT\\sJOIN|LEFT\\sOUTER\\sJOIN|INNER\\sJOIN|NATURAL\\sJOIN|WHERE|GROUP|HAVING|ORDER\\sBY|LIMIT)', 'sg');
        var responseJoin = regexJoin.exec(inputCode);
        if (responseJoin) {
            var baseRegex = String(responseJoin[2]);
            const regexArgumentJoin = /^([\w]+)|\sAS\s|([\s\w.=-]+)ON\s([\w\s-.=]+)/gmi;
            let responseArgumentJoin;

            while ((responseArgumentJoin = regexArgumentJoin.exec(baseRegex)) !== null) {
                if (responseArgumentJoin.index === regexArgumentJoin.lastIndex) {
                    regexArgumentJoin.lastIndex++;
                }

                responseArgumentJoin.forEach((match, groupIndex) => {
                    if (match && groupIndex === 0 && typeof joinData.table == 'undefined') {
                        joinData.table = match.replace('ps_', '');
                    }

                    if (match && groupIndex === 2 && typeof joinData.alias == 'undefined') {
                        joinData.alias = match.trim();
                    }

                    if (match && groupIndex === 3 && typeof joinData.restriction == 'undefined') {
                        joinData.restriction = match.replace(/\n/g, ' ');
                    }
                });
            }
        }
    }

    if (typeJoin === 'naturalJoin') {
        var regexJoin = new RegExp('(NATURAL\\sJOIN)\\s(.+?)\\s+', 'sg');
        var responseJoin = regexJoin.exec(inputCode);
        if (responseJoin) {
            responseJoin = responseJoin[2];
            joinData.table = responseJoin.replace('ps_', '');
        }
    }

    return joinData;
}

function processWhere(inputCode)
{
    var whereData = new Array();

    var regexWhere = new RegExp('WHERE\\s(.+?)\\s+(GROUP|HAVING|ORDER\\sBY|LIMIT)\\s+', 'sg');
    var responseWhere = regexWhere.exec(inputCode);

    if (responseWhere) {
        responseWhere[1].split('AND').forEach(function(whereArgument) {
            if (whereArgument.indexOf('TRUE') == -1) {
                whereData.push(whereArgument.replace(/\n/g, '').trim());
            }
        })
    } else {
        whereData = responseWhere;
    }

    return whereData;
}

function processGroupBy(inputCode)
{
    var groupByData = new Object();
    var regexQueryAttributes =  new RegExp('HAVING|ORDER\\sBY|LIMIT', 'gmi');
    var responseQueryAttributes = regexQueryAttributes.exec(inputCode);

    var regexGroupBy = new RegExp('GROUP\\sBY\\s+((.+?\\s|^)+)' + responseQueryAttributes[0] + '\\s', 'gmi');
    var responseGroupBy = regexGroupBy.exec(inputCode);

    if (responseGroupBy) {
        groupByData = responseGroupBy[1].replace(/\n|\r|\s/g, '').split(',')
    } else {
        groupByData = responseGroupBy;
    }

    return groupByData;
}

function processHaving(inputCode)
{
    var havingData = new Object();
    var regexHaving = new RegExp('HAVING\\s(.+)$', 'gmi');
    var responseHaving = regexHaving.exec(inputCode);

    if (responseHaving) {
        havingData = responseHaving[1].trim();
    } else {
        havingData = responseHaving;
    }

    return havingData;
}

function processOrderBy(inputCode)
{
    var orderByData = new Object();
    var regexOrderBy = new RegExp('ORDER\\sBY\\s+((.+?\\s|^)+)(LIMIT|\\s)', 'gmi');
    var responseOrderBy = regexOrderBy.exec(inputCode);

    if (responseOrderBy) {
        orderByData = responseOrderBy[1].replace(/\n|\r/g, '').split(',');
    } else {
        orderByData = responseOrderBy;
    }

    return orderByData;
}

function processLimit(inputCode)
{
    var limitData = new Object();
    var regexLimit = new RegExp('LIMIT\\s(.+)$', 'mi');
    var responseLimit = regexLimit.exec(inputCode);

    if (responseLimit) {
        var attributes = responseLimit[1].trim().split(', ');
        limitData.limit = attributes[0];
        if (parseInt(attributes.length) >= 2) {
            limitData.offset = attributes[1];
        }
    } else {
        limitData = responseLimit;
    }

    return limitData;
}
