function LineChartWidget(d3, options)
{
    var svg = options.container.append('svg:svg')
        .attr({
            width: options.width,
            height: options.height
        })
        .classed(options.classes.background, true);

    function pathTween(d1, precision) {
        return function() {
            var path0 = this,
                path1 = path0.cloneNode(),
                n0 = path0.getTotalLength(),
                n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

            var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
            while ((i += dt) < 1) distances.push(i);
            distances.push(1);

            // Compute point-interpolators at each distance.
            var points = distances.map(function(t) {
                var p0 = path0.getPointAtLength(t * n0),
                p1 = path1.getPointAtLength(t * n1);
                return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
            });

            return function(t) {
                return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
            };
        };
    }

    var x = d3.scale.ordinal();
    x.rangePoints([ options.margins.left, options.width - options.margins.right ])
    var y = d3.scale.linear();
    y.range([ options.height - options.margins.top, options.margins.bottom ]);
    var line = d3.svg.line()
        .x(function(d) { return x(d.label); })
        .y(function(d) { return y(d.value); })
        .interpolate('monotone');

    var yAxis = d3.svg.axis().scale(y).orient("left").ticks(4);

    var yAxisG = svg.append("g")
        .attr("class", "y axis")
        .attr("opacity", "0")
        .call(yAxis);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var xAxisG = svg.append("g")
        .attr("class", "x axis")
        .attr("opacity", "0")
        .call(xAxis);

    yAxisG.attr("transform", "translate(" + options.margins.left + ", 0)")

    xAxisG.attr("transform", "translate(0," + (options.height - options.margins.bottom) + ")")

    var path = svg.append("path")
        .attr("fill", "transparent")
        .attr("stroke", "red")
        .attr("stroke-width", 3);

    var g = svg.append("g");

    var transitionDuration = options.transitionDuration;
    options.transitionDuration = 0;

    this.setData = function (data)
    {
        x
            .domain(data.map(function (d) { return d.label; }));

        y
            .domain([
                d3.min(data, function (d) { return d.value; }),
                d3.max(data, function (d) { return d.value; })
            ]);

        yAxisG
            .transition().ease('cubic-out')
            .duration(options.transitionDuration)
            .attr("opacity", "1")
            .call(yAxis);

        xAxisG
            .transition().ease('cubic-out')
            .duration(options.transitionDuration)
            .attr("opacity", "1")
            .call(xAxis);

        path
            .transition().ease('cubic-out')
            .duration(options.transitionDuration)
            .attrTween("d", pathTween(line(data), 8));

        var updated = g.selectAll('g').data(data);

        updated
            .transition().ease('cubic-out')
            .duration(options.transitionDuration)
            .attr('transform', function (d) {
                return 'translate(' + x(d.label) + ', ' + y(d.value) + ')';
            });

        var o = updated
            .enter()
                .append('g');
                
                o
                    .attr('transform', function (d) {
                        return 'translate(' + x(d.label) + ', ' + 0 + ')';
                    })
                    .transition().ease('cubic-out')
                    .duration(options.transitionDuration)
                    .attr('transform', function (d) {
                        return 'translate(' + x(d.label) + ', ' + y(d.value) + ')';
                    });

                o
                    .append('circle')
                        .classed(options.classes.dot, true)
                        .attr({
                            'r': 1
                        });

        updated
            .exit()
                .remove();

        options.transitionDuration = transitionDuration;
    };
}
