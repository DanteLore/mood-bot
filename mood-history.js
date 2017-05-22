// https://bl.ocks.org/mbostock/1134768

function moodHistory(svgId, restAddr, color, freq) {
    var svg = d3.select("#" + svgId)

    var moods = color.domain();

    var margin = { top: 20, right: 50, bottom: 30, left: 20 };

    var svgElem = document.getElementById(svgId);
    var width = svgElem.clientWidth - margin.left - margin.right;
    var height = svgElem.clientHeight - margin.top - margin.bottom;

    svg = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scale.ordinal().rangeRoundBands([0, width]);
    var y = d3.scale.linear().rangeRound([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("right");

    fetchData();

    function fetchData() {
        d3.json(restAddr, function (error, jsonData) {
            if (error) throw error;

            updateArea(jsonData);

            setTimeout(function () {
                fetchData();
            }, freq);
        });
    }

    function updateArea(data) {
        var layers = d3.layout.stack()(moods.map(function (mood) {
            return data.map(function (d) {
                return { mood: mood, x: d.week, y: d.moods[mood] || 0 };
            });
        }));

        x.domain(layers[0].map(function (d) { return d.x; }));
        y.domain([0, d3.max(layers[layers.length - 1], function (d) { return d.y0 + d.y; })]).nice();

        var layer = svg.selectAll(".layer")
            .data(layers)

        layer.enter()
            .append("g")
            .attr("class", "layer")
            .style("fill", function (d, i) {
                return color(d[0].mood);
            });

        layer.transition()
            .style("fill", function (d, i) {
                return color(d[0].mood);
            });

        var bars = layer.selectAll("rect")
            .data(function (d) {
                return d;
            });

        bars.enter().append("rect")
            .attr("x", function (d) { return x(d.x); })
            .attr("y", function (d) { return y(d.y + d.y0); })
            .attr("height", function (d) { return y(d.y0) - y(d.y + d.y0); })
            .attr("width", x.rangeBand() - 1);

        bars.transition().duration(1000)
            .attr("x", function (d) { return x(d.x); })
            .attr("y", function (d) { return y(d.y + d.y0); })
            .attr("height", function (d) { return y(d.y0) - y(d.y + d.y0); })
            .attr("width", x.rangeBand() - 1);

        bars.exit().remove();

        svg.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(" + width + ",0)")
            .call(yAxis);
    }
}