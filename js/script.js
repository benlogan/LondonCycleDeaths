(function (d3, $, topojson) {
    var chartWidth = 700;
    var fullWidth = 900;
    var Tooltip = (function () {
        var $tooltip = $('#case-tooltip');

        return {
            show: function (d, x, y)
            {
                $tooltip
                    .fadeIn()
                    .css({
                        position: 'absolute',
                        left: x + 'px',
                        top: y + 'px'
                    });

                if (d.size && d.size > 1) {
                    $tooltip.find('.panel-heading')
                        .hide();

                    $tooltip.find('.panel-body')
                        .empty()
                        .append($('<div>').html('<p>This point consists of ' + d.size + ' individual cases. Zoom in to see them.</p>'));
                } else {
                    $tooltip.find('.panel-heading')
                        .show()
                        .text(d.title);

                    $tooltip.find('.panel-body')
                        .empty()
                        .append(
                            $('<img>')
                                .css('width', '100%')
                                .attr('src', d.image.src)
                        )
                        .append($('<div>').html(d.excerpt))
                        .append(
                            $('<div class="pull-left">')
                                .append(d.date.toLocaleDateString('en-GB'))
                        )
                        .append(
                            $('<div class="pull-right">')
                                .append($('<a class="btn btn-primary btn-xs">').text('Read more...').attr('href', d.url))
                        );
                }
            },

            hide: function ()
            {
                $tooltip.fadeOut();
            }
        };
    }());

    var map = new MapWidget(d3, {
        container: d3.select('#districts'),
        width: fullWidth,
        height: 500,
        padding: 0.9,
        transitionDuration: 750,
        choropleth: {
            lowColor: '#F2B199',
            //lowColor: '#AAFFAA',
            //highColor: '#FFAAAA'
            highColor: '#401107'
        },
        styles: {
            background: {
                'class': 'map-widget'
            },
            button: {
                'class': 'map-widget-button btn btn-default btn-xs'
            },
            feature: {
                'class': 'map-widget-feature',
                'stroke-width': 1
            },
            point: {
                'class': 'map-widget-point',
                'stroke-width': 1,
                'r': 3
            }
        },
        map:{
            center: [ -0.0883, 51.4915 ],
            rotation: [ 0, 0 ],
            scale: 70000
        },
        districtIdGetter: function (d) {
            return d && d.properties && d.properties.Name || null;
        },
        onPointClick: function (d) {
            Tooltip.show(d, d3.event.pageX - 6, d3.event.pageY - 6);
            d3.event.stopPropagation();
        },
        onZoom: function () {
            update();
        }
    });

    $('body').on('click', function () {
        Tooltip.hide();
    });

    var lineChart = new LineChartWidget(d3, {
        container: d3.select('#chart'),
        width: 700,
        height: 200,
        margins: {
            top: 40,
            right: 40,
            bottom: 40,
            left: 40
        },
        transitionDuration: 750,
        classes: {
            background: 'linechart',
            dot: 'dot'
        }
    });

    /*
    function generateRandomData()
    {
        var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        var k = Math.random() * 1000 + 50;

        return labels.filter(function () { return Math.random() > 0.5 }).map(function (label) {
            return {
                label: label,
                value: Math.round(Math.random() * k)
            };
        });
    }

    lineChart.setData(generateRandomData());
    */

    /*
    var timeframe = new RadioPanelWidget(d3, {
        container: d3.select('#timeframe'),
        items: d3.range(2001, 2016).map(function (year) {
            return {
                label: String(year),
                value: year
            };
        }),
        width: 900,
        height: 40,
        multiple: true,
        classes: {
            background: 'timeframe'
        },
        onSelectionChange: function () {
            update();
        }
    });
    */

    var aggregates = new RadioPanelWidget(d3, {
        container: d3.select('#aggregate'),
        items: [
            {
                label: 'Totals by year',
                value: 'years'
            },
            {
                label: 'Totals by month',
                value: 'months'
            },
            {
                label: 'Totals by weekday',
                value: 'weekdays'
            },
            {
                label: 'Totals by hour',
                value: 'hours'
            }
        ],
        width: 160,
        height: 200,
        multiple: false,
        vertical: true,
        classes: {
            background: 'aggregates'
        },
        onSelectionChange: function () {
            update();
        }
    });

    var slider = new function (d3, options)
    {
        var svg = options.container.append('svg:svg')
            .attr({
                'width': options.width,
                'height': options.height
            });

        var years = new d3.scale.ordinal()
            .rangeBands([ 0, options.width ]);

        var yearsG = svg.append('g').attr('class', 'years');

        var x = this.x = new d3.time.scale()
            .range([ 0, options.width ]);

        var brush = new d3.svg.brush()
            .x(x)
            .on('brushend', function () {
                if (!d3.event.sourceEvent) {
                    return;
                }

                var extent0 = brush.extent(),
                    extent1 = extent0.map(d3.time.year.round);

                if (extent1[0] >= extent1[1]) {
                    extent1[0] = d3.time.year.floor(extent0[0]);
                    extent1[1] = d3.time.year.ceil(extent0[1]);
                }

                brushG.transition()
                    .call(brush.extent(extent1))
                    .call(brush.event);
            })
            .on('brush', function () {
                options.onChange && options.onChange();
            });

        var brushG = svg.append('g')
            .call(brush);

        brushG.selectAll("rect")
            .attr("height", options.height);

        var yearLabels = [];

        this.setPoints = function (points)
        {
            var dateRange = d3.extent(points, function (d) { return d.date; });

            yearLabels = d3.range(dateRange[0].getFullYear(), dateRange[1].getFullYear() + 1);

            x.domain(dateRange.map(d3.time.year.round));

            years.domain(yearLabels);

            yearsG.selectAll('g')
                .data(yearLabels)
                    .call(function (r) {
                        r.attr({
                            'transform': function (d) { return 'translate(' + years(d) + ', 0)'; }
                        });

                        r.enter()
                            .append('g')
                                .attr({
                                    'transform': function (d) { return 'translate(' + years(d) + ', 0)'; }
                                })
                                .call(function () {
                                    this.append('rect')
                                        .attr({
                                            'width': years.rangeBand(),
                                            'height': options.height
                                        });

                                    this.append('text')
                                        .attr({
                                            'dx': years.rangeBand() / 2,
                                            'dy': options.height / 2,
                                            'text-anchor': 'middle',
                                            'alignment-baseline': 'middle'
                                        })
                                        .text(function (d) { return d; });
                                });

                        r.exit()
                            .remove();
                    });
        };

        this.getAllYears = function ()
        {
            return yearLabels;
        };

        this.setExtent = function (e, quiet)
        {
            brush.extent(e);
            
            brushG.transition().duration(1000).ease('linear').call(brush);

            if (!quiet) {
                brush.event(brushG);
            }
        };

        this.getExtent = function ()
        {
            return brush.extent();
        };
    }(d3, {
        container: d3.select('#slider'),
        width: chartWidth,
        height: 40,
        onChange: function () {
            update(true);
        }
    });

    var update;

    d3.json('data/statcrime.json', function (_topology) {
        //d3.json('data.php', function (cases) {
        d3.json('data/data.json', function (cases) {
            cases.forEach(function (item) {
                item.date = new Date(item.timestamp * 1000);
            });

            var aggregators = (function () {
                function generic(data, keys, keyFunctor)
                {
                    var tmp = {};

                    data.forEach(function (item) {
                        var key = keyFunctor(item);
                        tmp[key.value] = (tmp[key.value] || 0) + 1;
                    });

                    var result = [];

                    keys.forEach(function (key) {
                        result.push({
                            label: key,
                            value: tmp[key] || 0
                        });
                    });

                    return result;
                }

                return {
                    years: function (data) {
                        var yearNames = slider.getAllYears();//timeframe.options.items.map(function (item) { return item.value; });

                        return generic(data, yearNames, function (item) {
                            return {
                                value: item.date.getFullYear()
                            };
                        });
                    },

                    months: function (data) {
                        var monthNames = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

                        return generic(data, monthNames, function (item) {
                            return {
                                value: monthNames[item.date.getMonth()]
                            };
                        });
                    },

                    weekdays: function (data) {
                        var weekdayNames = 'Sun Mon Tue Wed Thu Fri Sat'.split(' ');

                        return generic(data, weekdayNames, function (item) {
                            return {
                                value: weekdayNames[item.date.getDay()]
                            };
                        });
                    },

                    hours: function (data) {
                        var hourNames = d3.range(0, 23).map(function (v) {
                            if (v === 0) {
                                return 'midnight';
                            }

                            if (v < 12) {
                                return v + 'am';
                            }

                            if (v === 12) {
                                return 'noon';
                            }

                            return (v - 12) + 'pm';
                        });

                        return generic(data, hourNames, function (item) {
                            return {
                                value: hourNames[item.date.getHours()]
                            };
                        });
                    }
                };
            }());

            var topology = topojson.feature(_topology, _topology.objects.boroughs).features;

            update = function (dontAnimate)
            {
                console.log(1);

                if (animation.isRunning()) {
                    animation.stop();
                    return;
                }

                var data = [].concat(cases);

                var aggregator = (function () {
                    //var years = timeframe.getSelection();
                    var years = slider.getAllYears();

                    if (years.length === 1) {
                        return aggregators.months;
                    } else {
                        return aggregators[(aggregates.getSelection()[0] || {}).value] || aggregators.years;
                    }
                }());

                data = (function (data, extent) {
                    return data.filter(function (item) {
                        return item.date >= extent[0] && item.date <= extent[1];
                    });
                }(data, slider.getExtent()));

                topology.forEach(function (a) {
                    a.total = data.filter(function (b) {
                        return b.district === a.properties.Name;
                    }).length;
                });

                map.setTopology(topology);
                map.setPoints(data, $('#clasterize').is(':checked'));

                lineChart.setData(aggregator(data));
            };

            var animation = (function (cases, map, topology) {
                var date0 = d3.time.year.floor(d3.min(cases, function (item) { return item.date; })),
                    date1 = d3.time.year.ceil(d3.max(cases, function (item) { return item.date; })),
                    extent = null,
                    t = null,
                    position = 0,
                    delay = 500,
                    speed = 20,
                    steps = chartWidth / speed;

                var step = function () {
                    position += speed;
                    console.log(position,chartWidth);
                    t = null;

                    var date = slider.x.invert(position);
                    var dateprev = Math.max(slider.x.invert(position-speed),date0);

                    if (date > date1) {
                        animation.stop();
                        slider.setExtent([ date0, date1 ]);
                    } else {
                        extent = [ date0, date ];
                        
                        d3.select('#bike')
                            .style('left', slider.x(dateprev) + 'px')
                            .transition()
                            .duration(delay)
                            .ease('linear')
                            .style('left', slider.x(date) + 'px');

                        slider.setExtent(extent, true);

                        topology.forEach(function (a) {
                            a.total = cases.filter(function (b) {
                                return b.district === a.properties.Name;
                            }).length;
                        });
                        
                        var max = d3.max(topology, function (d) { return d.total; });

                        var data = (function (data, extent) {
                            return data.filter(function (item) {
                                return item.date >= extent[0] && item.date <= extent[1];
                            });
                        }(cases, extent));

                        topology.forEach(function (a) {
                            a.total = data.filter(function (b) {
                                return b.district === a.properties.Name;
                            }).length;
                        });
                        
                        map.setTopology(topology, max);
                        map.setPoints(data, false, true);
                        update();

                        t = setTimeout(step, delay);
                    }
                };

                return {
                    isComplete: function(){
                        return position >= chartWidth;
                    },
                    restart: function(){
                        position = 0;
                        this.start();
                    },
                    isRunning: function ()
                    {
                        return !!t;
                    },

                    start: function ()
                    {
                        step();
                        $('#bike').fadeIn();
                        $("#playpause span.glyphicon").addClass("glyphicon-pause").removeClass("glyphicon-play");
                    },

                    stop: function ()
                    {
                        $('#bike').fadeOut();
                        clearTimeout(t);
                        t = null;

                        if (extent) {
                            slider.setExtent(extent);
                        }
                        $("#playpause span.glyphicon").removeClass("glyphicon-pause").addClass("glyphicon-play");
                    }
                };
            }(cases, map, topology));

            $('#aggregation').on('change', function () {
                update();
            });

            $('#clasterize').on('click', function () {
                update();
            });
            
            $("#playpause").on("click",function(){
                if(animation.isRunning()){
                    animation.stop();
                }else{
                    if(animation.isComplete()) animation.restart();
                    else animation.start();
                }
            });

            slider.setPoints(cases);
            slider.setExtent([
                d3.time.year.floor(d3.min(cases, function (item) { return item.date; })),
                d3.time.year.ceil(d3.max(cases, function (item) { return item.date; }))
            ]);
            //timeframe.setSelection(timeframe.options.items);
            aggregates.select(aggregates.options.items[0]);

            animation.start();
        });
    });
}(d3, $, topojson));
