var current_cost_duration = null;
var current_region = null;

$("#cost-dropdown").find("li").bind("click", function (e) {
    change_cost(e.target.getAttribute("duration"));
});

$("#region-dropdown").find("li").bind("click", function (e) {
    var region = e.target.getAttribute("region");
    change_region(region);
    setup_column_toggle(region);
});

function change_region(region) {
    // update menu text
    var first = region.charAt(0).toUpperCase();
    var text = first + region.substr(1);

    $("#region-dropdown").find(".dropdown-toggle .text").text("Region: " + text);

    // update selected menu option
    $('#region-dropdown').find('li a').each(function (i, e) {
        e = $(e);
        if (e.attr('duration') == region) {
            e.parent().addClass('active');
        } else {
            e.parent().removeClass('active');
        }
    });

    var region_formatted = region.toLowerCase().replace(/\s+/g, '');
    var current_region_formatted = current_region != null ? current_region.toLowerCase().replace(/\s+/g, '') : region_formatted;

    $("#" + current_region_formatted).removeClass('show').addClass('hide');
    $("#" + region_formatted).removeClass('hide').addClass('show');

    current_region = region;
}

function change_cost(duration) {
    // update menu text
    var first = duration.charAt(0).toUpperCase();
    var text = first + duration.substr(1);
    $("#cost-dropdown").find(".dropdown-toggle .text").text("Cost: " + text);

    // update selected menu option
    $('#cost-dropdown').find('li a').each(function (i, e) {
        e = $(e);
        if (e.attr('duration') == duration) {
            e.parent().addClass('active');
        } else {
            e.parent().removeClass('active');
        }
    });

    var hour_multipliers = {
        "hourly": 1,
        "daily": 24,
        "weekly": (7 * 24),
        "monthly": (24 * 30),
        "yearly": (365 * 24)
    };
    var multiplier = hour_multipliers[duration];
    var per_time;
    $.each($("td.cost"), function (i, elem) {
        elem = $(elem);
        per_time = elem.attr("hour_cost");
        per_time = (per_time * multiplier).toFixed(2);
        elem.text("$" + per_time + " " + duration);
    });

    current_cost_duration = duration;
}

function setup_column_toggle(region) {
    var formatted_region = region.toLowerCase().replace(/\s+/g, '');
    var tables = $(".data");
    // reset the filter dropdown every time otherwise we will never wire up the
    // proper names or columns associated with the names in the dropdown which
    // leads to the columns visibility not being toggled.
    var filter = $("#filter-dropdown");
    filter.find('ul').empty();

    // loop through each table
    $.each(tables, function(index, element) {
        var table = $(element);
        // get the name of the table
        var table_name = table.attr('name');

        // make sure we are dealing with the table that is visible
        if (table_name == formatted_region) {
            // get column headings of the active table and add them to the filter button
            $.each(table.find("thead tr th"), function (i, elem) {
                filter.find("ul").append(
                    $('<li>', {class: "active"}).append(
                        $('<a>', {href: "javascript:;"}).text($(elem).text()).click(function (e) {
                            toggle_column(table, i);

                            $(this).parent().toggleClass("active");
                            $(this).blur(); // prevent focus style from sticking in Firefox
                            e.stopPropagation(); // keep dropdown menu open
                        })
                    )
                );
            });
        } else {
            // this call is necessary to ensure we restore the column
            // visibility for any columns that may have been hidden previously
            show_all_columns(table);
        }

        // fix a render issue before redrawing the table
        table.css('width', '100%');
    });
}

$(function () {
    $(document).ready(function () {
        $('.data').dataTable({
            "bPaginate": false,
            "bDestroy": true,
            "bInfo": false,
            "bStateSave": true,
            "aoColumnDefs": [
                {
                    "aTargets": ["memory", "computeunits", "storage", "ioperf"],
                    "sType": "span-sort"
                }
            ],
            // default sort by linux cost
            "aaSorting": [
                [ 8, "asc" ]
            ],
            "fnDrawCallback": function () {
                // Whenever the table is drawn, update the costs. This is necessary
                // because the cost duration may have changed while a filter was being
                // used and so some rows will need updating.
                // do the same with the region
                change_cost(current_cost_duration);
                change_region(current_region);
            }
        });
    });

    $.extend($.fn.dataTableExt.oStdClasses, {
        "sWrapper": "dataTables_wrapper form-inline"
    });

    var start_region = 'US East - Virginia';
    change_cost('hourly');
    change_region(start_region);

    setup_column_toggle(start_region);

    // enable bootstrap tooltips
    $('abbr').tooltip({
        placement: function (tt, el) {
            return (this.$element.parents('thead').length) ? 'top' : 'right';
        }
    });
});

// sorting for columns with more complex data
// http://datatables.net/plug-ins/sorting#hidden_title
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    "span-sort-pre": function (elem) {
        var matches = elem.match(/sort="(.*?)"/);
        if (matches) {
            return parseInt(matches[1], 10);
        }
        return 0;
    },

    "span-sort-asc": function (a, b) {
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },

    "span-sort-desc": function (a, b) {
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
});

// toggle columns
function toggle_column(table, col_index) {
    var data_table = table.dataTable();
    var is_visible = data_table.fnSettings().aoColumns[col_index].bVisible;
    data_table.fnSetColumnVis(col_index, is_visible ? false : true);
}

// show all columns of the table
function show_all_columns(table) {
    var data_table = table.dataTable();
    var total_col_count = data_table.fnSettings().aoColumns.length;

    for (var col_index = 0; col_index < total_col_count; col_index++) {
        data_table.fnSetColumnVis(col_index, true);
    }
}
