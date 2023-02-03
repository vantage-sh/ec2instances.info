'use strict';

var g_app_initialized = false;
var g_data_table = null;
var g_settings = {};

var g_settings_defaults = {
  pricing_unit: 'instance',
  cost_duration: 'hourly',
  region: 'us-east-1',
  reserved_term: 'yrTerm1Standard.noUpfront',
  savings_plan_term: 'yrTerm1Savings.allUpfront',
  min_memory: 0,
  min_vcpus: 0,
  min_memory_per_vcpu: 0,
  default_sort_col: 39,
  min_storage: 0,
  selected: '',
  compare_on: false,
};

function init_data_table() {
  // create a second header row
  $('#data thead tr').clone(true).appendTo('#data thead');

  // add a text input filter to each column of the new row
  $('#data thead tr:eq(1) th').each(function (i) {
    $(this).attr('column-index', i);

    // TODO: When adding a new service, we are forced to edit this. Instead it should be controlled in HTML.
    if (window.location.href.includes('rds')) {
      // Set min inputs for RDS columns
      if (i == 2) {
        $(this).html(
          "<input data-action='datafilter' data-type='memory' class='form-control' placeholder='Min Mem: 0'/>",
        );
        return;
      } else if (i == 3) {
        $(this).html(
          "<input data-action='datafilter' data-type='storage' class='form-control' placeholder='Min Storage: 0'/>",
        );
        return;
      } else if (i == 6) {
        $(this).html(
          "<input data-action='datafilter' data-type='vcpus' class='form-control' placeholder='Min vCPUs: 0'/>",
        );
        return;
      }
    } else if (window.location.href.includes('cache')) {
      // Set min inputs for ElastiCache columns
      if (i == 2) {
        $(this).html(
          "<input data-action='datafilter' data-type='memory' class='form-control' placeholder='Min Mem: 0'/>",
        );
        return;
      } else if (i == 3) {
        $(this).html(
          "<input data-action='datafilter' data-type='vcpus' class='form-control' placeholder='Min vCPUs: 0'/>",
        );
        return;
      }
    } else if (window.location.href.includes('redshift')) {
      // Set min inputs for Redshift columns
      if (i == 2) {
        $(this).html(
          "<input data-action='datafilter' data-type='memory' class='form-control' placeholder='Min Mem: 0'/>",
        );
        return;
      } else if (i == 3) {
        $(this).html(
          "<input data-action='datafilter' data-type='vcpus' class='form-control' placeholder='Min vCPUs: 0'/>",
        );
        return;
      }
    } else if (window.location.href.includes('opensearch')) {
      // Set min inputs for OpenSearch columns
      if (i == 2) {
        $(this).html(
          "<input data-action='datafilter' data-type='memory' class='form-control' placeholder='Min Mem: 0'/>",
        );
        return;
      } else if (i == 3) {
        $(this).html(
          "<input data-action='datafilter' data-type='vcpus' class='form-control' placeholder='Min vCPUs: 0'/>",
        );
        return;
      }
    } else {
      // Set min inputs for EC2 columns
      if (i == 2) {
        $(this).html(
          "<input data-action='datafilter' data-type='memory' class='form-control' placeholder='Min Mem: 0'/>",
        );
        return;
      } else if (i == 4) {
        $(this).html(
          "<input data-action='datafilter' data-type='vcpus' class='form-control' placeholder='Min vCPUs: 0'/>",
        );
        return;
      } else if (i == 5) {
        $(this).html(
          "<input data-action='datafilter' data-type='memory-per-vcpu' class='form-control' placeholder='Min Mem/vCPU: 0'/>",
        );
        return;
      } else if (i == 6) {
        $(this).html(
          "<input data-action='datafilter' data-type='gpus' class='form-control' placeholder='Min GPUs: 0'/>",
        );
        return;
      } else if (i == 18) {
        $(this).html(
          "<input data-action='datafilter' data-type='storage' class='form-control' placeholder='Min Storage: 0'/>",
        );
        return;
      }
    }

    var title = $(this).text().trim();
    $(this).html("<input type='text' class='form-control' placeholder='Filter...'/>");
    $('input', this).on('keyup change', function () {
      if (g_data_table.column(i).search() !== this.value) {
        // If filter value is a valid regexp then search as regexp, otherwise ignore and search as text
        var isRegExp = true;
        try {
          var r = new RegExp(this.value);
        } catch (e) {
          // Failed to compile
          isRegExp = false;
        }
        g_data_table.column(i).search(this.value, isRegExp, false).draw();
      }
    });
  });
  g_data_table = $('#data').DataTable({
    bPaginate: false,
    bInfo: false,
    orderCellsTop: true,
    oSearch: {
      bRegex: true,
      bSmart: false,
    },
    dom: 'Bt',
    fixedHeader: true,
    select: {
      style: 'ec2-checkbox',
    },
    aoColumnDefs: [
      {
        orderable: false,
        className: '',
        targets: 0,
      },
      // The columns below are sorted according to the sort attr of the <span> tag within their data cells
      {
        aTargets: [
          'memory',
          'computeunits',
          'vcpus',
          'storage',
          'ebs-throughput',
          'ebs-iops',
          'ebs-max-bandwidth',
          'networkperf',
          'cost-ondemand',
          'cost-reserved',
          'cost-spot-min',
          'cost-spot-max',
          'cost-ebs-optimized',
          'maxenis',
          'memory-per-vcpu',
          'gpu_memory',
        ],
        sType: 'span-sort',
      },
      {
        // The columns below are hidden by default
        aTargets: [
          'architecture',
          'computeunits',
          'memory-per-vcpu',
          'ecu-per-vcpu',
          'emr-support',
          'gpus',
          'gpu_model',
          'gpu_memory',
          'compute_capability',
          'fpgas',
          'physical_processor',
          'clock_speed_ghz',
          'intel_avx',
          'intel_avx2',
          'intel_avx512',
          'intel_turbo',
          'enhanced-networking',
          'maxips',
          'maxenis',
          'linux-virtualization',
          'cost-emr',
          'cost-ondemand-rhel',
          'cost-ondemand-sles',
          'cost-ondemand-dedicated',
          'cost-ondemand-mswinSQL',
          'cost-ondemand-mswinSQLEnterprise',
          'cost-ondemand-mswinSQLWeb',
          'cost-ondemand-linuxSQL',
          'cost-ondemand-linuxSQLEnterprise',
          'cost-ondemand-linuxSQLWeb',
          'cost-reserved-rhel',
          'cost-reserved-sles',
          'cost-reserved-dedicated',
          'cost-reserved-mswinSQL',
          'cost-reserved-mswinSQLEnterprise',
          'cost-reserved-mswinSQLWeb',
          'cost-reserved-linuxSQL',
          'cost-reserved-linuxSQLEnterprise',
          'cost-reserved-linuxSQLWeb',
          'cost-spot-min-mswin',
          'cost-spot-min-rhel',
          'cost-spot-min-sles',
          'cost-spot-max-linux',
          'cost-spot-max-mswin',
          'cost-spot-max-rhel',
          'cost-spot-max-sles',
          'ebs-baseline-throughput',
          'ebs-baseline-bandwidth',
          'ebs-baseline-iops',
          'ebs-throughput',
          'ebs-iops',
          'ebs-as-nvme',
          'ebs-max-bandwidth',
          'cost-ebs-optimized',
          'trim-support',
          'warmed-up',
          'ipv6-support',
          'placement-group-support',
          'vpc-only',
          'azs',
          'generation',
        ],
        bVisible: false,
      },
    ],
    // default sort by linux cost
    aaSorting: [[g_settings_defaults.default_sort_col, 'asc']],

    initComplete: function () {
      // fire event in separate context so that calls to get_data_table()
      // receive the cached object.
      setTimeout(function () {
        on_data_table_initialized();
      }, 0);
    },

    // Store and load filtering, sorting, etc - core datatable feature
    stateSave: true,
    stateDuration: 0,
    stateLoaded: function (settings, data) {
      $('#data thead tr:eq(1) th').each(function (i) {
        var col_index = parseInt($(this).attr('column-index'));
        $('input', this).val(data.columns[col_index].search.search);
      });

      // handle where the user had a search saved locally
      if (!g_settings.compare_on) {
        $('#fullsearch').val(data.search.search);
      }
    },

    // Allow export to CSV: only visible columns and only current filtered data
    buttons: [
      {
        extend: 'csv',
        text: 'Export',
        className: 'btn-primary d-none d-xxl-block',
        exportOptions: {
          modifier: {search: 'applied'},
          columns: ':visible',
        },
      },
    ],
  });
  g_data_table.buttons().container().appendTo($('#export'));

  return g_data_table;
}

$(document).ready(function () {
  vantage_settings();
  var urlpath = window.location.pathname;

  // service specific table defaults, namely sorting by cheapest instance
  if (urlpath.includes('/azure/')) {
    g_settings_defaults.region = 'us-east';
    g_settings_defaults.reserved_term = 'yrTerm1Standard.allUpfront';
    g_settings_defaults.default_sort_col = 7;
  } else if (urlpath.includes('/rds/')) {
    g_settings_defaults.default_sort_col = 9;
  } else if (urlpath.includes('/cache/')) {
    g_settings_defaults.default_sort_col = 5;
  } else if (urlpath.includes('/redshift/')) {
    g_settings_defaults.default_sort_col = 8;
  } else if (urlpath.includes('/opensearch/')) {
    g_settings_defaults.default_sort_col = 6;
  }

  init_data_table();
});

function change_cost() {
  // update pricing duration menu text
  var duration = g_settings.cost_duration;
  var pricing_unit = g_settings.pricing_unit;
  var precision = 4;

  var hour_multipliers = {
    secondly: 1 / (60 * 60),
    minutely: 1 / 60,
    hourly: 1,
    daily: 24,
    weekly: 7 * 24,
    monthly: (365 * 24) / 12,
    annually: 365 * 24,
  };

  var measuring_units = {
    instances: '',
    vcpu: 'vCPU',
    ecu: 'ECU',
    memory: 'GiB',
  };

  var duration_multiplier = hour_multipliers[duration];
  var pricing_unit_modifier = 1;
  var per_time;

  // Display these as 'per' but maintain 'secondly' for backwards compatibility
  if (duration === 'secondly') {
    duration = 'per sec';
    precision = 6;
  } else if (duration === 'minutely') {
    duration = 'per min';
    precision = 6;
  }

  var pricing_measuring_units = ' ' + duration;
  if (pricing_unit != 'instance') {
    pricing_measuring_units = pricing_measuring_units + ' / ' + measuring_units[pricing_unit];
  }
  $.each($('td.cost-ondemand'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(
      elem.closest('tr').attr('id'),
      g_settings.region,
      elem.data('platform'),
      'ondemand',
    );
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(precision);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  $.each($('td.cost-reserved'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(
      elem.closest('tr').attr('id'),
      g_settings.region,
      elem.data('platform'),
      'reserved',
      g_settings.reserved_term,
    );
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(precision);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  $.each($('td.cost-savings-plan'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(
      elem.closest('tr').attr('id'),
      g_settings.region,
      elem.data('platform'),
      'reserved',
      g_settings.savings_plan_term,
    );
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(precision);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  $.each($('td.cost-spot-min'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(
      elem.closest('tr').attr('id'),
      g_settings.region,
      elem.data('platform'),
      'spot_min',
    );
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(precision);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  $.each($('td.cost-spot-max'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(
      elem.closest('tr').attr('id'),
      g_settings.region,
      elem.data('platform'),
      'spot_max',
    );
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(precision);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  $.each($('td.cost-ebs-optimized'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(elem.closest('tr').attr('id'), g_settings.region, 'ebs');
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(4);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  $.each($('td.cost-emr'), function (i, elem) {
    elem = $(elem);
    if (pricing_unit != 'instance') {
      pricing_unit_modifier = elem.data(pricing_unit);
    }
    per_time = get_pricing(elem.closest('tr').attr('id'), g_settings.region, 'emr', 'emr');
    if (
      per_time &&
      !isNaN(per_time) &&
      !isNaN(pricing_unit_modifier) &&
      pricing_unit_modifier > 0
    ) {
      per_time = ((per_time * duration_multiplier) / pricing_unit_modifier).toFixed(4);
      elem.html('<span sort="' + per_time + '">$' + per_time + pricing_measuring_units + '</span>');
    } else {
      elem.html('<span sort="999999">unavailable</span>');
    }
  });

  maybe_update_url();
}

function change_availability_zones() {
  $.each($('td.azs'), function (i, elem) {
    elem = $(elem);
    var instance_type = elem.closest('tr').attr('id');
    var instance_azs = get_instance_availability_zones(instance_type, g_settings.region);
    if (Array.isArray(instance_azs) && instance_azs.length) {
      var instance_azs_string = instance_azs.join(', ');
      elem.html(instance_azs_string);
    } else {
      elem.empty();
    }
  });
}

function change_region(region, called_on_init) {
  if ((called_on_init && region === 'us-east-1') || (called_on_init && region === 'us-east')) {
    // Don't load pricing data on initial page load. It's already there.
    return;
  }

  g_settings.region = region;

  var urlpath = window.location.pathname;
  var prices_path = urlpath + 'pricing_' + region + '.json';
  var azs_path = urlpath + 'instance_azs_' + region + '.json';

  Promise.all([
    fetch(prices_path)
      .then((response) => response.json())
      .then((data) => (_pricing = data)),
    fetch(azs_path)
      .then((response) => response.json())
      .then((data) => (_instance_azs = data)),
  ]).then(() => {
    var region_name = null;
    $('#region-dropdown li a').each(function (i, e) {
      e = $(e);
      if (e.data('region') === region) {
        e.parent().addClass('active');
        region_name = e.text();
      } else {
        e.parent().removeClass('active');
      }
    });
    $('#region-dropdown .dropdown-toggle .text').text(region_name);
    change_availability_zones();
    redraw_costs();
  });

  return true;
}

function change_reserved_term(term) {
  if (term.includes('Savings')) {
    // Account for Savings Plan pricing
    g_settings.savings_plan_term = term;
  } else {
    g_settings.reserved_term = term;
  }
  var $dropdown = $('#reserved-term-dropdown'),
    $activeLink = $dropdown.find('li a[data-reserved-term="' + term + '"]'),
    term_name = $activeLink.text();

  $dropdown.find('li').removeClass('active');
  $activeLink.closest('li').addClass('active');
  $dropdown.find('.dropdown-toggle .text').text(term_name);
}

function change_cost_duration(duration) {
  // update duration selected menu option
  g_settings.cost_duration = duration;
  $('#cost-dropdown li a').each(function (i, e) {
    e = $(e);
    if (e.attr('duration') == g_settings.cost_duration) {
      var first = g_settings.cost_duration.charAt(0).toUpperCase();
      var text = first + g_settings.cost_duration.substr(1);
      if (g_settings.cost_duration === 'secondly') {
        text = 'Per Second';
      } else if (g_settings.cost_duration === 'minutely') {
        text = 'Per Minute';
      }
      $('#cost-dropdown .dropdown-toggle .text').text(text);
      e.parent().addClass('active');
    } else {
      e.parent().removeClass('active');
    }
  });
}

function change_pricing_unit(unit) {
  // update pricing unit selected menu option
  g_settings.pricing_unit = unit;
  $('#pricing-unit-dropdown li a').each(function (i, e) {
    e = $(e);
    if (e.attr('pricing-unit') == g_settings.pricing_unit) {
      e.parent().addClass('active');
      // update pricing unit menu text
      $('#pricing-unit-dropdown .dropdown-toggle .text').text(e.text());
    } else {
      e.parent().removeClass('active');
    }
  });
}

// Update all visible costs to the current duration.
// Called after new columns or rows are shown as their costs may be inaccurate.
function redraw_costs() {
  change_cost();
  g_data_table.rows().invalidate().draw();
}

function setup_column_toggle() {
  $.each(g_data_table.columns().indexes(), function (i, idx) {
    var column = g_data_table.column(idx);
    $('#filter-dropdown ul').append(
      $('<li>')
        .toggleClass('active', column.visible())
        .append(
          $('<a class="dropdown-item" href="javascript:;">')
            .text($(column.header()).text())
            .click(function (e) {
              toggle_column(i);
              $(this).parent().toggleClass('active');
              $(this).blur(); // prevent focus style from sticking in Firefox
              e.stopPropagation(); // keep dropdown menu open
            }),
        ),
    );
  });
}

function setup_clear() {
  $('.btn-clear').click(function () {
    // Reset app.
    g_settings = JSON.parse(JSON.stringify(g_settings_defaults)); // clone
    g_data_table.search('');
    clear_row_selections();
    maybe_update_url();
    store.clear();
    g_data_table.state.clear();
    window.location.reload();
  });
}

function clear_row_selections() {
  $('#data tbody tr').removeClass('highlight');
}

function url_for_selections() {
  var params = {
    min_memory: g_settings.min_memory,
    min_vcpus: g_settings.min_vcpus,
    min_memory_per_vcpu: g_settings.min_memory_per_vcpu,
    min_storage: g_settings.min_storage,
    filter: g_data_table.settings()[0].oPreviousSearch['sSearch'],
    region: g_settings.region,
    pricing_unit: g_settings.pricing_unit,
    cost_duration: g_settings.cost_duration,
    reserved_term: g_settings.reserved_term,
    compare_on: g_settings.compare_on,
  };

  if (g_settings.selected !== '') {
    params.selected = g_settings.selected.split(',');
  } else {
    params.selected = [];
  }

  // avoid storing empty or default values in URL
  for (var key in params) {
    if (params[key] === '' || params[key] == null || params[key] === g_settings_defaults[key]) {
      delete params[key];
    }
  }

  // selected rows
  var selected_row_ids = $('#data tbody tr.highlight')
    .map(function () {
      return this.id;
    })
    .get();

  if (selected_row_ids.length > 0) {
    for (var s in selected_row_ids) {
      if (!params.selected.includes(selected_row_ids[s])) {
        params.selected.push(selected_row_ids[s]);
      }
    }
  }

  var url = location.origin + location.pathname;
  var parameters = [];
  for (var setting in params) {
    if (params[setting] !== undefined) {
      if (setting === 'selected' && params[setting].length == 0) {
        continue;
      }
      parameters.push(setting + '=' + params[setting]);
    }
  }

  // Turns the selected (highlighted) rows into a comma separated list in the URL
  if (parameters.length > 0) {
    url = url + '?' + parameters.join('&');
  }
  g_settings.selected = params.selected.join();
  return url;
}

function maybe_update_url() {
  // Save localstorage data as well
  store.set('ec2_settings', g_settings);

  if (!history.replaceState) {
    return;
  }

  try {
    var url = url_for_selections();
    if (document.location == url) {
      return;
    }

    history.replaceState(null, '', url);
  } catch (ex) {
    // doesn't matter
  }
}

var apply_min_values = function () {
  var all_filters = $('[data-action="datafilter"]');
  var data_rows = $('#data tr:has(td)');

  data_rows.show();

  all_filters.each(function () {
    var filter_on = $(this).data('type');
    var filter_val = parseFloat($(this).val()) || 0;

    // update global variable for dynamic URL
    g_settings['min_' + filter_on.replace('-', '_')] = filter_val;

    var match_fail = data_rows.filter(function () {
      var row_val;
      row_val = parseFloat(
        $(this)
          .find('td[class~="' + filter_on + '"] span')
          .attr('sort'),
      );
      return row_val < filter_val;
    });

    match_fail.hide();
  });
  maybe_update_url();
};

function jq(myid) {
  return '#' + myid.replace(/(:|\.|\[|\]|,|=|@)/g, '\\$1');
}

function on_data_table_initialized() {
  if (g_app_initialized) return;
  g_app_initialized = true;

  // parse the URL for any settings
  load_settings();

  // populate filter inputs
  apply_min_values();

  // apply highlight to selected rows
  $.each(g_settings.selected.split(','), function (_, id) {
    if (id === '') {
      return;
    } else {
      // get an instance id like 't3.nano' from the URL, making sure to escape it
      // previously this was not working for RDS and Elasticache and fixed #189, #532, and #658
      $(jq(id)).addClass('highlight');
    }
  });

  configure_highlighting();

  // Allow row filtering by min-value match.
  $('[data-action=datafilter]').on('keyup', apply_min_values);

  var will_redraw_costs = change_region(g_settings.region, true);
  change_reserved_term(g_settings.reserved_term);
  var urlpath = window.location.pathname;
  if (urlpath.includes('/azure/')) {
    change_reserved_term(g_settings.savings_plan_term);
  }
  change_cost_duration(g_settings.cost_duration);
  change_pricing_unit(g_settings.pricing_unit);

  if (!will_redraw_costs) {
    // State management situation. Most of this code is synchronous, we get the locally saved
    // settings from load_settings() and check the reserved term from change_reserved_term().
    // When those things are applied, we need to change the costs displayed. However the region
    // change is async, so we have to wait for the data to load and then call change_cost(). That's
    // handled in the callback in change_region(). If change_cost() is called there, we don't need
    // to call it here. More scenarios:
    // - URL is ?region=ap-northeast-1&pricing_unit=vcpu&cost_duration=monthly, don't redraw here
    // - URL is ?cost_duration=monthly, redraw here
    // - URL is ?cost_duration=monthly&reserved_term=yrTerm1Convertible.partialUpfront, redraw here
    change_cost();
  }

  // handle a search (/?filter=foo) from the URL
  if (!g_settings.compare_on && g_settings.filter !== undefined) {
    g_data_table.search(g_settings['filter']).draw();
    $('#fullsearch').val(g_settings['filter']);
  }

  $.extend($.fn.dataTableExt.oStdClasses, {
    sWrapper: 'dataTables_wrapper form-inline',
  });

  setup_column_toggle();

  setup_clear();

  // enable bootstrap tooltips
  $('abbr').tooltip({
    placement: function (tt, el) {
      // if the cell is in the header, show the tooltip on top
      return $(this).parents('thead').length ? 'top' : 'right';
    },
  });

  $('#pricing-unit-dropdown li').bind('click', function (e) {
    var unit = e.target.getAttribute('pricing-unit');
    change_pricing_unit(unit);
    redraw_costs();
  });

  $('#cost-dropdown li').bind('click', function (e) {
    var cost_duration = e.target.getAttribute('duration');
    change_cost_duration(cost_duration);
    redraw_costs();
  });

  $('#region-dropdown li').bind('click', function (e) {
    var region = $(e.target).data('region');
    change_region(region, false);
  });

  $('#reserved-term-dropdown li').bind('click', function (e) {
    change_reserved_term($(e.target).data('reservedTerm'));
    redraw_costs();
  });

  // apply classes to search box
  $('div.dataTables_filter input').addClass('form-control search');
}

// sorting for colums with more complex data
// http://datatables.net/plug-ins/sorting#hidden_title
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
  'span-sort-pre': function (elem) {
    var matches = elem.match(/sort="(.*?)"/);

    if (matches) {
      return parseFloat(matches[1]);
    }
    return 0;
  },

  'span-sort-asc': function (a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  },

  'span-sort-desc': function (a, b) {
    return a < b ? 1 : a > b ? -1 : 0;
  },
});

// toggle columns
function toggle_column(col_index) {
  var is_visible = g_data_table.column(col_index).visible();
  g_data_table.column(col_index).visible(is_visible ? false : true);
  redraw_costs();
}

// retrieve all the parameters from the location string
function load_settings() {
  // load settings from local storage
  g_settings = store.get('ec2_settings') || {};

  if (location.search) {
    var params = location.search.slice(1).split('&');
    params.forEach(function (param) {
      var parts = param.split('=');
      var key = parts[0];
      var val = parts[1];
      // support legacy key names
      if (key == 'cost') {
        key = 'cost_duration';
      } else if (key == 'term') {
        key = 'reserved_term';
      }
      // store in global settings
      console.log('Loaded setting from URL:', key, '=', val);
      g_settings[key] = val;
    });
  }

  // use default settings for missing values
  for (var key in g_settings_defaults) {
    if (g_settings[key] === undefined) {
      g_settings[key] = g_settings_defaults[key];
    }
  }

  return g_settings;
}

function configure_highlighting() {
  var $compareBtn = $('.btn-compare'),
    $rows = $('#data tbody tr');

  // Allow row highlighting by clicking.
  $rows.click(function (e) {
    // don't highlight if the user clicked on a link to a detail page
    try {
      if (e.target.href.includes('aws') || e.target.href.includes('aws')) {
        return;
      }
    } catch (err) {
      // if a link does not exist, continue
    }

    $(this).toggleClass('highlight');

    // remove a deselected row from the list of selected rows
    if (!$(this).hasClass('highlight')) {
      var selected = g_settings.selected.split(',');
      const index = selected.indexOf($(this).attr('id'));
      selected.splice(index);
      g_settings.selected = selected.join();
    }

    update_compare_button();
    maybe_update_url();
  });

  $compareBtn.click(function () {
    g_settings.compare_on = !g_settings.compare_on;
    if (!g_settings.compare_on) {
      // clear the comparison when End Compare is clicked
      g_data_table.search('').draw();
    }
    update_compare_button();
    update_visible_rows();
    maybe_update_url();
  });

  // these two calls handle if there's an initial comparison, loaded from the URL or local storage
  update_compare_button();
  update_visible_rows();
}

function update_visible_rows() {
  if (g_settings.compare_on) {
    // prepare the list of selected rows as an input to search()
    var selected_ids = g_settings.selected.replaceAll(',', '|');

    // clear any existing filters/searches which may be hiding rows
    g_data_table.columns('').search('');
    $('.form-control').val('');

    // render only the selected rows
    g_data_table.search(selected_ids, true, false).draw();
  }
}

function update_compare_button() {
  var $compareBtn = $('.btn-compare'),
    $rows = $('#data tbody tr');

  if (!g_settings.compare_on) {
    $compareBtn
      .text($compareBtn.data('textOff'))
      .addClass('btn-purple')
      .removeClass('btn-danger')
      .prop('disabled', !$rows.is('.highlight'));
  } else {
    $compareBtn.text($compareBtn.data('textOn')).addClass('btn-danger').removeClass('btn-purple');
  }
}

$('#fullsearch').on('keyup', function () {
  g_data_table.search(this.value).draw();
});
