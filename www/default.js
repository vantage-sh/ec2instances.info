var current_cost_duration = 'hourly';
var current_region = 'us-east-1';

function change_cost(duration) {
  // update menu text
  var first = duration.charAt(0).toUpperCase();
  var text = first + duration.substr(1);
  $("#cost-dropdown .dropdown-toggle .text").text("Cost: "+text);

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
    "monthly": (24*30),
    "annually": (365*24)
  };
  var multiplier = hour_multipliers[duration];
  var per_time;
  $.each($("td.cost"), function(i, elem) {
    elem = $(elem);
    per_time = elem.data("pricing")[current_region];
    if (per_time) {
      per_time = (per_time * multiplier).toFixed(2);
      elem.text("$" + per_time + " " + duration);
    } else {
      elem.text("unavailable");
    }
  });

  current_cost_duration = duration;
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

function setup_column_toggle() {
  // get column headings, add to filter button
  $.each($("#data thead tr th"), function(i, elem) {
    $("#filter-dropdown ul").append(
      $('<li>', {class: "active"}).append(
        $('<a>', {href: "javascript:;"})
          .text($(elem).text())
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

$(function() {
  $(document).ready(function() {
    $('#data').dataTable({
      "bPaginate": false,
      "bInfo": false,
      "bStateSave": true,
      "oSearch": {
        "bRegex" : true,
        "bSmart": false
      },
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
      "fnDrawCallback": function() {
        // Whenever the table is drawn, update the costs. This is necessary
        // because the cost duration may have changed while a filter was being
        // used and so some rows will need updating.
        change_cost(current_cost_duration);
      }
    });
  });

  $.extend($.fn.dataTableExt.oStdClasses, {
    "sWrapper": "dataTables_wrapper form-inline"
  });

  change_region('us-east-1');
  change_cost('hourly');

  setup_column_toggle();

  // enable bootstrap tooltips
  $('abbr').tooltip({ 
    placement: function(tt, el) { 
      return (this.$element.parents('thead').length) ? 'top' : 'right';
    }
  });
});

$("#cost-dropdown li").bind("click", function(e) {
  change_cost(e.target.getAttribute("duration"));
});

$("#region-dropdown li").bind("click", function(e) {
  change_region($(e.target).data('region'));
});

// sorting for colums with more complex data
// http://datatables.net/plug-ins/sorting#hidden_title
jQuery.extend(jQuery.fn.dataTableExt.oSort, {
  "span-sort-pre": function(elem) {
    var matches = elem.match(/sort="(.*?)"/);
    if (matches) {
      return parseInt(matches[1], 10);
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
  var table = $('#data').dataTable();
  var is_visible = table.fnSettings().aoColumns[col_index].bVisible;
  table.fnSetColumnVis(col_index, is_visible ? false : true);
}