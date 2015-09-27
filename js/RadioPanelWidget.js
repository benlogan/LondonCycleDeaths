define(function(){
    return function(options)
    {
        this.options = options;

        var self = this,
            svg = options.container.append('svg:svg')
                .attr({
                    width: options.width,
                    height: options.height
                })
                .classed(options.classes.background, true);

        var selected = [];

        var x, y;

        if (options.vertical) {
            x = function (d) { return 0; };

            y = d3.scale.ordinal()
                .rangeBands([ 0, options.height ])
                .domain(options.items.map(function (d) { return d.label; }));
        } else {
            x = d3.scale.ordinal()
                .rangeBands([ 0, options.width ])
                .domain(options.items.map(function (d) { return d.label; }));

            y = function (d) { return 0; };
        }

        var g = svg
            .append('g');

        var update = g.selectAll('g')
            .data(options.items)
                .enter()

        var gg = update
            .append('g')
                .attr('transform', function (d) {
                    return 'translate(' + x(d.label) + ', ' + y(d.label) + ')';
                });

        this.updateView = function ()
        {
            svg.selectAll('rect[tag=base]')
                .classed({
                    'item-background': true,
                    'active': function (d) { return selected.indexOf(d) !== -1; }
                });

            svg.selectAll('text[tag=text]')
                .classed({
                    'item-text': true,
                    'active': function (d) { return selected.indexOf(d) !== -1; }
                });
        };

        this.getSelection = function ()
        {
            return [].concat(selected);
        };

        this.isSelected = function (item)
        {
            return selected.indexOf(item) !== -1;
        };

        this.select = function (item)
        {
            this.setSelection(selected.concat([ item ]));
        };

        this.unselect = function (item)
        {
            this.setSelection(selected.filter(function (v) { return v !== item }));
        };

        this.setSelection = function (items)
        {
            var tmp = [],
                changed = false;

            if (items && items.forEach) {
                selected.forEach(function (item) {
                    if (items.indexOf(item) !== -1) {
                        tmp.push(item);
                    } else {
                        changed = true;
                    }
                });

                items.forEach(function (item) {
                    if (selected.indexOf(item) === -1) {
                        tmp.push(item);
                        changed = true;
                    }
                });
            }

            if (changed) {
                selected = tmp;
                this.updateView();
                options.onSelectionChange && options.onSelectionChange.call(this);
            }
        };

        this.clearSelection = function ()
        {
            this.setSelection([]);
        };

        var selecting = false;

        gg
            .append('rect')
                .attr({
                    'width': options.vertical ? options.width : x.rangeBand(),
                    'height': !options.vertical ? options.height : y.rangeBand(),
                    'tag': 'base'
                });

        gg
            .append('text')
                .attr({
                    'dx': (options.vertical ? options.width : x.rangeBand()) / 2,
                    'dy': (!options.vertical ? options.height : y.rangeBand()) / 2,
                    'text-anchor': 'middle',
                    'alignment-baseline': 'middle',
                    'tag': 'text'
                })
                .text(function (d) { return d.label; });

        gg
            .append('rect')
                .attr({
                    'fill': 'transparent',
                    'width': options.vertical ? options.width : x.rangeBand(),
                    'height': !options.vertical ? options.height : y.rangeBand()
                })
                .on('mousedown', function (d) {
                    self.setSelection([ d ]);
                    if (options.multiple) {
                        selecting = true;
                    }
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                })
                .on('mousemove', function (d) {
                    if (selecting) {
                        self.select(d);
                        d3.event.stopPropagation();
                        d3.event.preventDefault();
                    }
                });

        d3.select('body').on('mouseup', function () {
            if (selecting) {
                selecting = false;
                d3.event.stopPropagation();
                d3.event.preventDefault();
            }
        });

        this.updateView();
    };
});
