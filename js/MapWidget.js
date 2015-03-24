function MapWidget(d3, options)
{
    var initialScale = 1;

    var projection = d3.geo.mercator()
        .center(options.map.center)
        .rotate(options.map.rotation)
        .scale(options.map.scale);

    var center = projection(options.map.center);

    var path = d3.geo.path()
        .projection(projection);

    var lastScale = null;

    var zoom = d3.behavior.zoom()
        .scale(1)
        .translate([ options.width - center[0], options.height - center[1] ])
        .on('zoom', function () {
            if (lastScale !== zoom.scale()) {
                lastScale = zoom.scale();
                options.onZoom && options.onZoom();
            }
            zoomed(false);
        });

    projection.translate([ 0, 0 ]);

    var svg = options.container.append('svg')
        .attr(options.styles.background)
        .attr('width', options.width)
        .attr('height', options.height);

    var features = svg.append('g');
    var points = svg.append('g');

    function updatePointSize()
    {
        this
            .attr('r', function (d) { return options.styles.point.r * Math.pow(d.size || 1, 0.3) / zoom.scale(); })
            .attr('stroke-width', options.styles.point['stroke-width'] / zoom.scale());
    }

    function zoomed(animate) {
        (animate ? features.transition().duration(options.transitionDuration) : features)
            .attr({
                'transform': 'translate(' + zoom.translate() + ')scale(' + zoom.scale() + ')',
                'stroke-width': options.styles.feature['stroke-width'] / zoom.scale()
            });

        (animate ? points.transition().duration(options.transitionDuration) : points)
            .attr('transform', 'translate(' + zoom.translate() + ')scale(' + zoom.scale() + ')')
            .selectAll('circle')
                .call(updatePointSize);
    }

    $('<button />')
        .attr(options.styles.button)
        .text('Reset Zoom')
        .appendTo(options.container.node())
        .on('click', function () {
            zoom
                .scale(initialScale)
                .translate([ options.width - center[0], options.height - center[1] ])

            zoomed(true);
        });

    svg.call(zoom);

    var first = true;

    this.setTopology = function (topology, _max)
    {
        var updateColors = (function () {
            var colorInterpolator = d3.interpolateRgb(
                    options.choropleth.lowColor,
                    options.choropleth.highColor
                ),
                min = 0,
                max = _max || d3.max(topology, function (d) { return d.total; });

            return function ()
            {
                this
                    .transition()
                    .duration(options.transitionDuration)
                    .style('fill', function (d) {
                        return colorInterpolator(max && d.total / max);
                    });
            };
        }());

        var update = features.selectAll('path').data(topology);

        update
            .call(updateColors);

        update.enter()
            .append('path')
                .attr(options.styles.feature)
                .attr('d', path)
                .call(updateColors);

        if (first) {
            first = false;

            var tmp = [];

            features.selectAll('path').each(function (d) {
                tmp.push(path.bounds(d));
            });

            var minX = d3.min(tmp, function (b) { return b[0][0]; }),
                minY = d3.min(tmp, function (b) { return b[0][1]; }),
                maxX = d3.max(tmp, function (b) { return b[1][0]; }),
                maxY = d3.max(tmp, function (b) { return b[1][1]; });

            initialScale = Math.min(options.width / (maxX - minX), options.height / (maxY - minY)) * options.padding;

            zoom
                .scaleExtent([ initialScale / 4, initialScale * 4 ])
                .scale(initialScale);
        }

        zoomed(false);
    };

    var nextPointIndex = 1;

    this.setPoints = function (array, clasterize, emphasis)
    {
        array.forEach(function (point) {
            if (!point.__index__) {
                point.__index__ = nextPointIndex++;
            }

            point.size = 1;
        });

        if (clasterize) {
            var epsilon = (function (minPixels) {
                function distance(a, b) {
                    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
                }

                return distance(
                    projection.invert([ 0, 0 ]),
                    projection.invert([ 0, minPixels / zoom.scale() ])
                );
            }((options.styles.point.r + options.styles.point['stroke-width']) * 4));

            var minPointsInCluster = 2;

            var clusters = new DBSCAN().run(
                array.map(function (point) {
                    return [ point.location.longitude, point.location.latitude ];
                }),
                epsilon,
                minPointsInCluster
            ).map(function (cluster) {
                var points = cluster.map(function (index) {
                    return array[index];
                });

                points[0].size = points.length;

                return points[0];
            });

            array = clusters;
        }

        var update = points.selectAll('g')
            .data(array, function (d) {
                return d.__index__;
            });

        update
            .selectAll('circle')
                .call(updatePointSize);

        update
            .enter()
                .append('g')
                    .on('mouseover', options.onPointMouseOver)
                    .on('mouseout', options.onPointMouseOut)
                    .on('click', options.onPointClick)
                    .attr({
                        'transform': function (d) { return 'translate(' + projection([ d.location.longitude, d.location.latitude ]) + ')'; }
                    })
                    .append('circle')
                        .attr({
                            'opacity': 0
                        })
                        .attr(options.styles.point)
                        .call(updatePointSize)
                        .call(function () {
                            if (emphasis && this.node()) {
                                this.attr('r', this.attr('r') * 15);
                            }
                        })
                        .transition()
                        .duration(options.transitionDuration)
                        .call(updatePointSize)
                        .attr('opacity', 1);

        update
            .exit()
                .transition()
                .duration(options.transitionDuration)
                .attr('opacity', 0)
                .remove();
    };
}
