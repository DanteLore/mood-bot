'use strict';

var AWS = require("aws-sdk");

var docClient = new AWS.DynamoDB.DocumentClient();

Array.prototype.countBy = function (key) {
    return this.reduce(function (rv, x) {
        rv[x[key]] = (rv[x[key]] || 0) + 1;
        return rv;
    }, {});
};

Array.prototype.groupBy = function (key) {
    return this.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

Date.prototype.subtractWeeks = function (wks) {
    return new Date(this.getTime() - (wks * 7 * 24 * 60 * 60 * 1000));
};

function sinceWeek(week) {
    return {
        TableName: "MoodResponses",
        IndexName: 'week-user_id-index',
        FilterExpression: "#wk >= :week",
        ExpressionAttributeNames: {
            "#wk": "week"
        },
        ExpressionAttributeValues: {
            ":week": week
        }
    };
}

function handleError(err, callback) {
    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    callback(null, { "error": JSON.stringify(err, null, 2) });
}

function handleData(data, callback, week) {
    console.log("Query succeeded.");

    var results = [];
    var weekData = data.Items.groupBy("week");
    var weeks = Object.keys(weekData).sort();

    weeks.forEach(function (wk) {
        var moods = weekData[wk].countBy("mood")
        results.push({ week: wk, moods: moods });
    });

    callback(null, results);
}

function runFor(start, callback) {
    var week = start.getWeek();
    console.log('Fetching mood results since week: ' + week);

    docClient.scan(sinceWeek(week), function (err, data) {
        if (err) {
            handleError(err, callback);
        } else {
            handleData(data, callback, week);
        }
    });
}

exports.handler = function (event, context, callback) {
    runFor(new Date().subtractWeeks(10), callback);
};