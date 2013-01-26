var current_cost_duration = null;

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
    "yearly": (365*24)
  };
  var multiplier = hour_multipliers[duration];
  var per_time;
  $.each($("td.cost"), function(i, elem) {
    elem = $(elem);
    per_time = elem.attr("hour_cost");
    per_time = (per_time * multiplier).toFixed(2);
    elem.text("$" + per_time + " " + duration);
  });

  current_cost_duration = duration;
}

function column_toggle_setup() {
  // get column headings, add to filter button
  $.each($("#data thead tr th"), function(i, elem) {
    $("#filter-dropdown ul").append("<li class=\"active\"><a href=\"javascript:;\" onclick=\"fnShowHide("+i+");\">"+elem.innerText+"</a></li>");
  });

  // toggle column buttons
  $("#filter-dropdown ul.dropdown-menu li").bind("click", function(e) {
    $(this).toggleClass("active");
  });
}

$(function() {
  $(document).ready(function() {
    $('#data').dataTable({
      "bPaginate": false,
      "bInfo": false,
      "aoColumnDefs": [
        {
          "aTargets": ["memory", "computeunits", "storage", "ioperf"],
          "sType": "span-sort"
        }
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

  change_cost('hourly');

  column_toggle_setup();
});

$("#cost-dropdown li").bind("click", function(e) {
  change_cost(e.target.getAttribute("duration"));
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
function fnShowHide(iCol) {
  var oTable = $('#data').dataTable();
  var bVis = oTable.fnSettings().aoColumns[iCol].bVisible;
  oTable.fnSetColumnVis( iCol, bVis ? false : true );
}