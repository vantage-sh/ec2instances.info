var default_cost_duration = 'hourly';
var default_region = 'us-east-1';
var default_reserved_term = 'yrTerm1.noUpfront';

var current_cost_duration = default_cost_duration;
var current_region = default_region;
var current_reserved_term = default_reserved_term;

var data_table = null;

var require_min = Array();
require_min['memory'] = 0;
require_min['computeunits'] = 0;
require_min['cores'] = 0;
require_min['storage'] = 0;

var require_max = Array();
require_max['memory'] = 500;
require_max['computeunits'] = 200;
require_max['cores'] = 64;
require_max['storage'] = 8000;

var defaults_min = Array();
defaults_min['memory'] = 0;
defaults_min['computeunits'] = 0;
defaults_min['cores'] = 0;
defaults_min['storage'] = 0;

var defaults_max = Array();
defaults_max['memory'] = 500;
defaults_max['computeunits'] = 200;
defaults_max['cores'] = 64;
defaults_max['storage'] = 8000;



function init_data_table() {
  data_table = $('#data').DataTable({
    "bPaginate": false,
    "bInfo": false,
    "bStateSave": true,
    "oSearch": {
      "bRegex" : true,
      "bSmart": false
    },
    "aoColumnDefs": [
      {
        "aTargets": ["memory", "computeunits", "cores", "coreunits", "storage", "ebs-throughput", "ebs-iops", "ebs-max-bandwidth", "networkperf"],
        "sType": "span-sort"
      },
      {
        "aTargets": ["ecu-per-core", "enhanced-networking", "maxips", "linux-virtualization", "cost-ondemand-mswinSQLWeb", "cost-ondemand-mswinSQL", "cost-reserved-mswinSQLWeb", "cost-reserved-mswinSQL", "ebs-throughput", "ebs-iops", "max_bandwidth"],
        "bVisible": false
      }
    ],
    // default sort by linux cost
    "aaSorting": [
      [ 15, "asc" ]
    ],
    'initComplete': function() {
      // fire event in separate context so that calls to get_data_table()
      // receive the cached object.
      setTimeout(function() {
        on_data_table_initialized();
      }, 0);
    },
    'drawCallback': function() {
      // abort if initialization hasn't finished yet (initial draw)
      if (data_table === null) {
        return;
      }

      // Whenever the table is drawn, update the costs. This is necessary
      // because the cost duration may have changed while a filter was being
      // used and so some rows will need updating.
      redraw_costs();
    }
  });

  return data_table;
}

$(document).ready(function() {
  init_data_table();
});


function change_cost(duration) {
  // update menu text
  var first = duration.charAt(0).toUpperCase();
  var text = first + duration.substr(1);
  $("#cost-dropdown .dropdown-toggle .text").text(text);

  // update selected menu option
  $('#cost-dropdown li a').each(function(i, e) {
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
    "weekly": (7*24),
    "monthly": (30*24),
    "annually": (365*24)
  };
  var multiplier = hour_multipliers[duration];
  var per_time;
  $.each($("td.cost-ondemand"), function(i, elem) {
    elem = $(elem);
    per_time = elem.data("pricing")[current_region];
    if (per_time && !isNaN(per_time)) {
      per_time = (per_time * multiplier).toFixed(3);
      elem.text("$" + per_time + " " + duration);
    } else {
      elem.text("unavailable");
    }
  });

  $.each($("td.cost-reserved"), function(i, elem) {
    elem = $(elem);
    per_time = elem.data("pricing")[current_region];

    if(!per_time) {
      elem.text("unavailable");
      return;
    }

    per_time = per_time[current_reserved_term];

    if (per_time && !isNaN(per_time)) {
      per_time = (per_time * multiplier).toFixed(3);
      elem.text("$" + per_time + " " + duration);
    } else {
      elem.text("unavailable");
    }
  });

  current_cost_duration = duration;
  maybe_update_url();
}

function change_region(region) {
  current_region = region;
  var region_name = null;
  $('#region-dropdown li a').each(function(i, e) {
    e = $(e);
    if (e.data('region') === region) {
      e.parent().addClass('active');
      region_name = e.text();
    } else {
      e.parent().removeClass('active');
    }
  });
  $("#region-dropdown .dropdown-toggle .text").text(region_name);
  change_cost(current_cost_duration);
}

function change_reserved_term(term) {
  current_reserved_term = term;
  var $dropdown = $('#reserved-term-dropdown'),
      $activeLink = $dropdown.find('li a[data-reserved-term="'+term+'"]'),
      term_name = $activeLink.text();

  $dropdown.find('li').removeClass('active');
  $activeLink.closest('li').addClass('active');

  $dropdown.find('.dropdown-toggle .text').text(term_name);
  change_cost(current_cost_duration);
}

// Update all visible costs to the current duration.
// Called after new columns or rows are shown as their costs may be inaccurate.
function redraw_costs() {
  change_cost(current_cost_duration);
}

function setup_column_toggle() {
  $.each(data_table.columns().indexes(), function(i, idx) {
    var column = data_table.column(idx);
    $("#filter-dropdown ul").append(
      $('<li>')
      .toggleClass('active', column.visible())
      .append(
        $('<a>', {href: "javascript:;"})
        .text($(column.header()).text())
        .click(function(e) {
          toggle_column(i);
          $(this).parent().toggleClass("active");
          $(this).blur(); // prevent focus style from sticking in Firefox
          e.stopPropagation(); // keep dropdown menu open
        })
      )
    );
  });
}

function url_for_selections() {
  // returns a string representing selected parameters in search boxes
  var settings = {
    computeunits_min: require_min['computeunits'],
    cores_min: require_min['cores'],
    memory_min: require_min['memory'],
    storage_min: require_min['storage'],

    computeunits_max: require_max['computeunits'],
    cores_max: require_max['cores'],
    memory_max: require_max['memory'],
    storage_max: require_max['storage'],

    filter: data_table.settings()[0].oPreviousSearch['sSearch'],
    region: current_region,
    cost: current_cost_duration,
    term: current_reserved_term
  };

  if (settings.computeunits_min == '') delete settings.computeunits_min;
  if (settings.cores_min == '') delete settings.cores_min;
  if (settings.memory_min == '') delete settings.memory_min;
  if (settings.storage_min == '') delete settings.storage_min;

  if (settings.computeunits_max == '') delete settings.computeunits_max;
  if (settings.cores_max == '') delete settings.cores_max;
  if (settings.memory_max == '') delete settings.memory_max;
  if (settings.storage_max == '') delete settings.storage_max;

  if (settings.filter == '') delete settings.filter
  if (settings.region == default_region) delete settings.region;
  if (settings.cost == default_cost_duration) delete settings.cost;
  if (settings.term == default_reserved_term) delete settings.term;

  // selected rows
  var selected_row_ids = $('#data tbody tr.highlight').map(function() {
    return this.id;
  }).get();
  if (selected_row_ids.length > 0) {
    settings.selected = selected_row_ids;
  }

  var url = location.origin + location.pathname;
  var parameters = [];
  for (var setting in settings) {
    if (settings[setting] !== undefined) {
      parameters.push(setting + '=' + settings[setting]);
    }
  }
  if (parameters.length > 0)
    url = url + '?' + parameters.join('&');
  return url;
}

function maybe_update_url() {
  if (!history.replaceState) {
    return;
  }

  try {
    var url = url_for_selections();
    if (document.location == url) {
      return;
    }

    history.replaceState(null, '', url);
  } catch(ex) {
    // doesn't matter
  }
}
/*
var apply_min_values = function() {
    var all_filters = $('[data-action="datafilter"]');
    var data_rows = $('#data tr:has(td)');

    data_rows.show();

    all_filters.each(function() {
        var filter_on = $(this).data('type');
        var filter_val = parseFloat($(this).val()) || 0;

        // update global variable for dynamic URL
        require[filter_on] = filter_val;

        var match_fail = data_rows.filter(function() {
            var row_val;
            row_val = parseFloat(
                $(this).find('td[class~="' + filter_on + '"] span').attr('sort')
                );
            return row_val < filter_val;
        });

        match_fail.hide();
    });
    maybe_update_url();
};
*/
var apply_min_max_values = function() {
  // man, this is really ugly, but works.

  // var all_filters = $('[data-action="datafilter"]');
  var all_filters_min = $('[limiter="min"]');
  var all_filters_max = $('[limiter="max"]');
  var data_rows = $('#data tr:has(td)');

  data_rows.show();

  all_filters_min.each(function() {
    // process rows if they are below minimum limit
    var filter_on = $(this).data('type');
    var filter_val = parseFloat($(this).val()) || defaults_min[filter_on];
    //console.log("min: filter_on " + filter_on + ' ' + filter_val)

    // update global variable for dynamic URL
    require_min[filter_on] = filter_val;

    var match_fail = data_rows.filter(function() {
        var row_val;
        row_val = parseFloat(
            $(this).find('td[class~="' + filter_on + '"] span').attr('sort')
            );
        return row_val < filter_val;
    });

    match_fail.hide();
  });

  all_filters_max.each(function() {
    // process rows if they are above maximum limit
    var filter_on = $(this).data('type');
    var filter_val = parseFloat($(this).val()) || defaults_max[filter_on];
    //console.log("max: filter_on " + filter_on + ' ' + filter_val)

    // update global variable for dynamic URL
    require_max[filter_on] = filter_val;

    var match_fail = data_rows.filter(function() {
        var row_val;
        row_val = parseFloat(
            $(this).find('td[class~="' + filter_on + '"] span').attr('sort')
            );
        return row_val > filter_val;
    });

    match_fail.hide();
  });

  maybe_update_url();
};

function on_data_table_initialized() {
  // process URL settings
  var url_settings = get_url_parameters();
  for (var key in url_settings) {
    switch(key) {
      case 'region':
        current_region = url_settings['region'];
        break;
      case 'cost':
        current_cost_duration = url_settings['cost'];
        break;
      case 'term':
        current_reserved_term = url_settings['term'];
        break;
      case 'filter':
        data_table.filter(url_settings['filter']);
        break;
      case 'memory_min':
        $('[data-action="datafilter"][data-type="memory"][limiter="min"]').val(url_settings['memory_min']);
        apply_min_max_values();
        break;
      case 'memory_max':
        $('[data-action="datafilter"][data-type="memory"][limiter="max"]').val(url_settings['memory_max']);
        apply_min_max_values();
        break;
      case 'cores_min':
        $('[data-action="datafilter"][data-type="cores"][limiter="min"]').val(url_settings['cores_min']);
        apply_min_max_values();
        break;
      case 'cores_max':
        $('[data-action="datafilter"][data-type="cores"][limiter="max"]').val(url_settings['cores_max']);
        apply_min_max_values();
        break;
      case 'computeunits_min':
        $('[data-action="datafilter"][data-type="computeunits"][limiter="min"]').val(url_settings['computeunits_min']);
        apply_min_max_values();
        break;
      case 'computeunits_max':
        $('[data-action="datafilter"][data-type="computeunits"][limiter="max"]').val(url_settings['computeunits_max']);
        apply_min_max_values();
        break;
      case 'storage_min':
        $('[data-action="datafilter"][data-type="storage"][limiter="min"]').val(url_settings['storage_min']);
        apply_min_max_values();
        break;
      case 'storage_max':
        $('[data-action="datafilter"][data-type="storage"][limiter="max"]').val(url_settings['storage_max']);
        apply_min_max_values();
        break;
      case 'selected':
        // apply highlight to selected rows
        $.each(url_settings['selected'].split(','), function(_, id) {
          id = id.replace('.', '\\.');
          $('#'+id).addClass('highlight');
        })
        break;
    }
  }

  configure_highlighting();

  // Allow row filtering by min-value match.
  $('[data-action=datafilter]').on('keyup', apply_min_max_values);

  change_region(current_region);
  change_cost(current_cost_duration);
  change_reserved_term(current_reserved_term);

  $.extend($.fn.dataTableExt.oStdClasses, {
    "sWrapper": "dataTables_wrapper form-inline"
  });

  setup_column_toggle();

  // enable bootstrap tooltips
  $('abbr').tooltip({
    placement: function(tt, el) {
      return (this.$element.parents('thead').length) ? 'top' : 'right';
    }
  });

  $("#cost-dropdown li").bind("click", function(e) {
    change_cost(e.target.getAttribute("duration"));
  });

  $("#region-dropdown li").bind("click", function(e) {
    change_region($(e.target).data('region'));
  });

  $("#reserved-term-dropdown li").bind("click", function(e) {
    change_reserved_term($(e.target).data('reservedTerm'));
  });

  // apply classes to search box
  $('div.dataTables_filter input').addClass('form-control search');
}

// sorting for colums with more complex data
// http://datatables.net/plug-ins/sorting#hidden_title
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
  "span-sort-pre": function(elem) {
    var matches = elem.match(/sort="(.*?)"/);
    if (matches) {
      return parseFloat(matches[1]);
    }
    return 0;
  },

  "span-sort-asc": function(a, b) {
    return ((a < b) ? -1 : ((a > b) ? 1 : 0));
  },

  "span-sort-desc": function(a, b) {
    return ((a < b) ? 1 : ((a > b) ? -1 : 0));
  }
});

// toggle columns
function toggle_column(col_index) {
  var is_visible = data_table.column(col_index).visible();
  data_table.column(col_index).visible(is_visible ? false : true);
  redraw_costs();
}

// retrieve all the parameters from the location string
function get_url_parameters() {
  var params = location.search.slice(1).split('&');
  var settings = {};
  params.forEach(function(param) {
    settings[param.split('=')[0]] = param.split('=')[1];
  });

  return settings;
}

function configure_highlighting() {
  var compareOn = false,
      $compareBtn = $('.btn-compare'),
      $rows = $('#data tbody tr');

  // Allow row highlighting by clicking.
  $rows.click(function() {
    $(this).toggleClass('highlight');

    if (!compareOn) {
      $compareBtn.prop('disabled', !$rows.is('.highlight'));
    }

    maybe_update_url();
  });

  $compareBtn.prop('disabled', !$($rows).is('.highlight'));
  $compareBtn.text($compareBtn.data('textOff'));

  $compareBtn.click(function() {
    if (compareOn) {
      $rows.show();
      $compareBtn.text($compareBtn.data('textOff'))
                 .addClass('btn-primary')
                 .removeClass('btn-success')
                 .prop('disabled', !$rows.is('.highlight'));
    } else {
      $rows.filter(':not(.highlight)').hide();
      $compareBtn.text($compareBtn.data('textOn'))
                 .addClass('btn-success')
                 .removeClass('btn-primary');
    }

    compareOn = !compareOn;
  });
}
