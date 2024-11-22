<!DOCTYPE html>

<html lang="en">
  <head>
    <meta charset="UTF-8">
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-TBZCV32');</script>
    <!-- End Google Tag Manager -->

    <link rel="stylesheet" href="/default.css" media="screen">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" type="image/png" href="https://assets.vantage.sh/www/favicon-32x32.png">
    <title>${i["Azure"][2]["value"]} pricing and specs - Vantage</title>
    <meta name="description" content="${description}">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  </head>
    
  <body>
    <div class="main">
      <div class="nav">
        <div class="logo-group me-md-3 me-0 align-items-center">
          <div class="d-flex align-items-center gap-2">
            <a href="/" class="logo">
              <img width="28" height="28" alt="Vantage Logo" src="/vantage-logo-icon.svg">
            </a>
            <div class="d-flex flex-column">
              <p class="fs-6 fw-semibold text-white mb-0">Instances</p>
              <a href="https://www.vantage.sh/?utm_campaign=Instances%20Blog%20Clicks&utm_source=presented-by" target="_blank" class="text-decoration-none text-white mb-0 opacity-75" style="font-size: 12px;">Presented by Vantage</a>
            </div>
          </div>
          <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon contr-mobile">
            <img src="/icon-github.svg" height="18" width="18" class="me-1" />
            Star
          </a>
        </div>
        <div class="d-flex">
          <div class="nav-buttons px-2 d-none d-xxl-block">
            <a target="_blank" href="https://vantage.sh/slack" class="btn btn-github btn-icon">
              <img src="/icon-slack.svg" height="18" width="18" class="me-1" />
              Slack
            </a>
          </div>
          <div class="nav-buttons d-none d-xxl-block">
            <a target="_black" href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon">
              <img src="/icon-github.svg" height="18" width="18" class="me-1" />
              Star
            </a>
          </div>
        </div>
      </div>
      <%include file="ads-banner-azure.mako"/>

      <div class="columns">
        <div class="column-left--parent justify-content-center">
          <div class="column-left">
            <h1 class="h3 mb-0 fw-bolder">${i["Azure"][2]["value"]}</h1>
            
            <!-- Description -->
            <p class="pt-md-4 py-3 mb-2 small lh-base">${description}</p>

            <div class="d-flex align-items-center mb-3">
              <span class="material-icons me-1">paid</span>
              <p class="h6 fw-semibold mb-0">Pricing</p>
            </div>
            <!-- Prices -->
            <div class="small d-flex flex-row flex-wrap pe-2 mb-4">
              <div class="col-md-3 col-6 mb-md-0 mb-3">
                <p class="h6 mb-0 fw-semibold" id="p_od"></p>
                <p class="mb-0 fs-12 text-muted">On Demand</p>
              </div>
              <div class="col-md-3 col-6 mb-md-0 mb-3">
                <p class="h6 mb-0 fw-semibold" id="p_spot"></p>
                <p class="mb-0 fs-12 text-muted">Spot</p>
              </div>
              <div class="col-md-3 col-6">
                <p class="h6 mb-0 fw-semibold" id="p_1yr"></p>
                <p class="mb-0 fs-12 text-muted">1 Yr Reserved</p>
              </div>
              <div class="col-md-3 col-6">
                <p class="h6 mb-0 fw-semibold" id="p_3yr"></p>
                <p class="mb-0 fs-12 text-muted">3 Yr Reserved</p>
              </div>
            </div>

            <!-- price Selects -->
            <div class="d-flex flex-wrap mt-2">
              <div class="col-6 pe-2 mb-2">
                <select class="form-select form-select-sm" id="region">
                  <!-- TODO: Localize default option order -->
                  % for r in regions:
                  <option value='${r[0]}'>${r[1]}</option>
                  % endfor
                </select>
              </div>
              <div class="col-6 mb-2">
                <select class="form-select form-select-sm" id="os">
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                </select>
              </div>
              <div class="col-6 pe-2">
                <select class="form-select form-select-sm" id="unit">
                  <option value="second">Per Second</option>
                  <option value="minute">Per Minute</option>
                  <option value="hour" selected="selected">Per Hour</option>
                  <option value="day">Per Day</option>
                  <option value="week">Per Week</option>
                  <option value="month">Per Month</option>
                  <option value="year">Per Year</option>
                </select>
              </div>
              <div class="col-6">
                <select class="form-select form-select-sm" id="term">
                  <option value="Standard.allUpfront">Reservation</option>
                  <option value="Standard.hybridbenefit">Reservation (Hybrid Benefit)</option>
                  <option value="Standard.subscription">Subscription</option>
                  <option value="Savings.allUpfront">Savings Plan</option>
                  <option value="Savings.hybridbenefit">Savings Plan (Hybrid Benefit)</option>
                  <option value="Savings.subscription">Savings Plan with Subscription<option>
                </select>
              </div>
            </div>

            <!-- Instance families -->
            <div class="mt-4 d-flex flex-column">
              <div class="d-flex align-items-center mb-3">
                <span class="material-icons me-1">dns</span>
                <p class="h6 fw-semibold mb-0">Family Sizes</p>
              </div>
              <table class="table table-mono mb-0">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th class="text-center">vCPUs</th>
                    <th class="text-center">Memory (GiB)</th>
                  </tr>
                </thead>
                <tbody>
                  % for f in family:
                    % if f["name"] == i["Azure"][1]['value']:
                    <tr class="no-link">
                      <td>${f["name"]}</td>
                    % else:
                    <tr>
                      <td><a href="/azure/vm/${f["name"]}">${f["name"]}</a></td>
                    % endif
                    <td class="text-center">${f["cpus"]}</td>
                    <td class="text-center">${f["memory"]}</td>
                  </tr>
                  % endfor
                </tbody>
              </table>
            </div>

            <p class="py-md-2 small lh-base"><a href="/azure/" class="text-decoration-none"><- All Azure VM Types</a></p>

            <!-- Instance variants -->
            % if len(variants) > 1:
            <div class="mt-4 d-flex flex-column">
              <div class="d-flex align-items-center mb-3">
                <span class="material-icons me-1">dns</span>
                <p class="h6 fw-semibold mb-0">Instance Variants</p>
              </div>
              <table class="table table-mono">
                <thead>
                  <tr>
                    <th>Variant</th>
                  </tr>
                </thead>
                <tbody>
                  % for v in variants:
                    % if v[0] == i["Azure"][1]['value']:
                      <tr class="no-link">
                        <td>${v[0]}</td>
                    % else:
                      <tr>
                        <td><a href="/azure/vm/${v[1]}">${v[0]}</a></td>
                    % endif
                    </tr>
                  % endfor
                </tbody>
              </table>
            </div>
            % endif
          </div>

          <div class="column-middle mb-5" style="max-width: 800px;">
            <div class="w-100 d-flex flex-column flex-fill pb-5">          
              <div class="d-flex align-items-center mb-3">
                <span class="material-icons me-1">info</span>
                <p class="h6 fw-semibold mb-0">Instance Details</p>
              </div>
              % for category, attrs in i.items():
                % if category == "Coming Soon":
                  % for a in attrs:
                    <!--<p>${a["display_name"]}</p>-->
                  % endfor
                % elif category == "Not Shown":
                <!--
                  <p>Request this data to be included on Github</p>
                  % for a in attrs:
                    <p>${a["cloud_key"]}</p>
                  % endfor
                -->
                % elif category == "Pricing":
                  <p></p>
                % else:
                  <table class="table" id="${category}">
                    <tr>
                      <th class="col-6 border-end"><a href="#${category}">${category}</a></th>
                      <th class="col-6">Value</th>
                    </tr>
                  % for a in attrs:
                    <tr>
                      <td class="col-6 border-end">${a["display_name"]}</td>
                      <td class="col-6"><span class="${a["style"]}">${a["value"]}</span></td>
                    </tr>
                  % endfor
                  </table>
                % endif
              % endfor
              % if len(unavailable) > 0 and false:
                <table class="table" id="Unavailable">
                  <tr>
                    <th class="col-4 border-end">Unavailable</th>
                    <th class="col-4 border-end">Unsupported Region</th>
                    <th class="col-4">Unsupported OS</th>
                  </tr>
                  % for u in unavailable:
                  <tr>
                    <td class="col-4 border-end">${u[0]}</td>
                    <td class="col-4 border-end">${u[1]}</td>
                    <td class="col-4">${u[2]}</td>
                  </tr>
                  % endfor
                </table>
              % endif
            </div>

          </div>

          <%include file="ads-detail-column.mako"/>
        </div>
      </div>
    </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js" type="text/javascript" charset="UTF-8"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.min.js" crossorigin="anonymous"></script>
  <script src="/store/store.js" type="text/javascript" charset="UTF-8"></script>
  <script src="/vantage.js" type="text/javascript" charset="UTF-8"></script>
  <script>
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzf3nm7AMdE5JRgU_-R_VFNdekkzhN1-RjiQDeqZu3UsojLH6Kdvo5G0pyC0UzJJKo4/exec'
    const form = document.forms['submit-to-google-sheet']

    form.addEventListener('submit', e => {
      e.preventDefault();
      $("#submit-feedback").attr("disabled", true);
      fetch(scriptURL, { method: 'POST', body: new FormData(form)})
        .then(response => {
          $("#submission-response").html("Feedback received!"); 
          $("#submit-feedback").attr("disabled", false); 
        })
        .catch(error => $("#submission-response").html("Something went wrong, contact support@vantage.sh"));
    })
  </script>
  <script type="text/javascript">
  $(function() {
    

    initialize_prices();
    disable_regions();

    $('#region').change(function() {
      recalulate_redisplay_prices()
    });
    $('#os').change(function() {
      recalulate_redisplay_prices()
    });
    $('#unit').change(function() {
      recalulate_redisplay_prices()
    });
    $('#term').change(function() {
      recalulate_redisplay_prices()
    });


    function format_price(element, price_value) {
      // Handle prices from $0.0001 to $100,000
      if (isNaN(price_value)) {
        $('#' + element).html('N/A');
      } else if (price_value === "N/A") {
        $('#' + element).html('N/A');
      } else if (price_value < .99) {
        $('#' + element).html("&dollar;" + price_value.toFixed(4));
      } else if (price_value > 99 && price_value <= 9999) {
        $('#' + element).html("&dollar;" + price_value.toFixed(2));
      } else if (price_value > 9999) {
        // TODO: localize, use periods instead of commas in EU for example
        $('#' + element).html("&dollar;" + Math.floor(price_value).toLocaleString('en-US'));
      } else {
        $('#' + element).html("&dollar;" + price_value.toFixed(3));
      }
    }

    function initialize_prices() {
      format_price("p_od", ${defaults[0]});
      format_price("p_spot", ${defaults[1]});
      format_price("p_1yr", ${defaults[2]});
      format_price("p_3yr", ${defaults[3]});
    };

    function disable_regions() {
      var regions = []
      var unavailable = ${unavailable};
      for (const u of unavailable) {
        if (u[2] == 'All') {
          regions.push(u[1]);
        }
      }

      $("#region option").each(function(i) {
        var dropdown_region = $(this).val();
        if (regions.includes(dropdown_region)) {
          $(this).attr("disabled", "disabled");
        }
      });

    };

    function recalulate_redisplay_prices() {
      var region = $('#region').val();
      var os = $('#os').val();
      var unit = $('#unit').val();
      var term = $('#term').val();
      var price = ${i["Pricing"]};
      var deny = ${unavailable};
      var displayed_prices = ['ondemand', '_1yr', 'spot', '_3yr'];
      var elements = ['p_od', 'p_1yr', 'p_spot', 'p_3yr'];

      // Check if this combination of price selections is available
      // Handle where only a specifc OS like Windows is not available in a region
      for (const d of deny) {
        if (d[1] === region) {
          if (d[3] === os || d[2] === 'All') {
            for (var i = 0; i < elements.length; i++) {
              format_price(elements[i], "N/A");
            }
            return;
          } 
        }
      }

      var hour_multipliers = {
        'second': 1 / (60 * 60),
        'minute': 1 / 60,
        'hour': 1,
        'day': 24,
        'week': 7 * 24,
        'month': 730,   // use convention of 730 hrs/month
        'year': 8760
      };


      for(var i =0; i < elements.length; i++) {
        var element = elements[i];
        var displayed_price = displayed_prices[i];
        
        var price_value = price[region][os][displayed_price];

        if (price_value == 'N/A') {
          $('#' + element).html('N/A');
        } else {

          // Handle the term conditions for reservations
          if (displayed_price === '_1yr' || displayed_price === '_3yr') {
            price_value = parseFloat(price_value[term]);
          }
          
          // Show by day, month, year etc
          price_value = parseFloat(price_value) * hour_multipliers[unit];
          
          format_price(element, price_value);
        }
      }
    }
  });
  </script>
  </body>
</html>