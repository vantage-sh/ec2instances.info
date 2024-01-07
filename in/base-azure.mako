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

    <%block name="meta"/>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="icon" type="image/png" href="https://assets.vantage.sh/www/favicon-32x32.png">
    <!-- Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/bs5/jq-3.6.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/datatables.min.css"/>
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/default.css" media="screen">
    <link rel="stylesheet" href="/style.css">
  </head>

  <body class="ec2instances">
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TBZCV32"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <div class="d-flex flex-column w-100 h-100">
      <div class="nav py-0">
        <div class="d-flex align-items-center">
          <div class="logo-group me-md-3 me-0">
            <a href="/" class="logo">
              <img width="135" height="35" alt="Vantage Logo" src="/vantage-logo-horizontal.svg">
            </a>
            <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon contr-mobile">
              <svg class="me-1" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" fill="#1a1a1c" d="M9 0C4.0275 0 0 4.0275 0 9C0 12.9825 2.57625 16.3463 6.15375 17.5387C6.60375 17.6175 6.7725 17.3475 6.7725 17.1112C6.7725 16.8975 6.76125 16.1888 6.76125 15.435C4.5 15.8513 3.915 14.8837 3.735 14.3775C3.63375 14.1187 3.195 13.32 2.8125 13.1062C2.4975 12.9375 2.0475 12.5212 2.80125 12.51C3.51 12.4987 4.01625 13.1625 4.185 13.4325C4.995 14.7937 6.28875 14.4113 6.80625 14.175C6.885 13.59 7.12125 13.1962 7.38 12.9712C5.3775 12.7463 3.285 11.97 3.285 8.5275C3.285 7.54875 3.63375 6.73875 4.2075 6.10875C4.1175 5.88375 3.8025 4.96125 4.2975 3.72375C4.2975 3.72375 5.05125 3.4875 6.7725 4.64625C7.4925 4.44375 8.2575 4.3425 9.0225 4.3425C9.7875 4.3425 10.5525 4.44375 11.2725 4.64625C12.9938 3.47625 13.7475 3.72375 13.7475 3.72375C14.2425 4.96125 13.9275 5.88375 13.8375 6.10875C14.4113 6.73875 14.76 7.5375 14.76 8.5275C14.76 11.9812 12.6562 12.7463 10.6538 12.9712C10.98 13.2525 11.2613 13.7925 11.2613 14.6363C11.2613 15.84 11.25 16.8075 11.25 17.1112C11.25 17.3475 11.4187 17.6287 11.8688 17.5387C15.4237 16.3463 18 12.9712 18 9C18 4.0275 13.9725 0 9 0Z" fill="white"/>
              </svg>
              Star
            </a>
          </div>
          <ul class="list-unstyled nav-tabs nav-buttons nav-position mb-0" style="padding-top: 14px;">
            <li role="presentation" class="${'active' if self.attr.active_ == 'ec2' else ''}">
              <a class="d-flex align-items-center" href="/azure/">
                VM 
              </a>
            </li>
          </ul>
        </div>
        <div class="d-flex align-items-center d-none d-xl-block">
          <img width="24" height="24" alt="Kubernetes Logo" src="/kubernetes-color.svg">
          <a href="https://console.vantage.sh/signup" class="vantage">Optimize <span class="fw-semibold">Kubernetes Costs</span> with pod efficiency reports -></a>
        </div>
        <div class="d-flex">
          <div class="nav-buttons px-2 d-none d-xxl-block">
            <a target="_blank" href="https://vantage.sh/slack" class="btn btn-purple btn-icon">
              <svg class="me-2" width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <mask id="mask0_2_502" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="1" y="1" width="22" height="22">
                  <path d="M22.6667 1.33334H1.33333V22.6667H22.6667V1.33334Z" fill="white"/>
                </mask>
                <g mask="url(#mask0_2_502)">
                  <path d="M9.19336 12.5789C7.95607 12.5789 6.95251 13.5825 6.95251 14.8198V20.4251C6.95251 21.6625 7.95607 22.666 9.19336 22.666C10.4307 22.666 11.4342 21.6625 11.4342 20.4251V14.8198C11.4333 13.5825 10.4298 12.5789 9.19336 12.5789Z" fill="white"/>
                  <path d="M1.35071 14.8199C1.35071 16.0581 2.35515 17.0626 3.59337 17.0626C4.8316 17.0626 5.83606 16.0581 5.83606 14.8199V12.5772H3.59515H3.59337C2.35515 12.5772 1.35071 13.5817 1.35071 14.8199Z" fill="white"/>
                  <path d="M9.19611 1.33234H9.19344C7.95522 1.33234 6.95078 2.33679 6.95078 3.57501C6.95078 4.81323 7.95522 5.81765 9.19344 5.81765H11.4343V3.57501C11.4343 3.57501 11.4343 3.57234 11.4343 3.57056C11.4334 2.33412 10.4316 1.33234 9.19611 1.33234Z" fill="white"/>
                  <path d="M3.57775 11.4402H9.19376C10.432 11.4402 11.4365 10.4357 11.4365 9.19753C11.4365 7.95931 10.432 6.95486 9.19376 6.95486H3.57775C2.33952 6.95486 1.33508 7.95931 1.33508 9.19753C1.33508 10.4357 2.33952 11.4402 3.57775 11.4402Z" fill="white"/>
                  <path d="M20.406 6.95389C19.1696 6.95389 18.1678 7.95567 18.1678 9.19211V9.19655V11.4392H20.4087C21.6469 11.4392 22.6514 10.4347 22.6514 9.19655C22.6514 7.95833 21.6469 6.95389 20.4087 6.95389H20.406Z" fill="white"/>
                  <path d="M12.5688 3.57497V9.19721C12.5688 10.4345 13.5723 11.4381 14.8097 11.4381C16.047 11.4381 17.0507 10.4345 17.0507 9.19721V3.57497C17.0507 2.33763 16.047 1.33408 14.8097 1.33408C13.5723 1.33408 12.5688 2.33763 12.5688 3.57497Z" fill="white"/>
                  <path d="M17.0506 20.423C17.0506 19.1857 16.047 18.1822 14.8097 18.1822H12.5688V20.4248C12.5697 21.6612 13.5723 22.6639 14.8097 22.6639C16.047 22.6639 17.0506 21.6604 17.0506 20.423Z" fill="white"/>
                  <path d="M20.4257 12.5771H14.8097C13.5715 12.5771 12.5671 13.5816 12.5671 14.8198C12.5671 16.058 13.5715 17.0625 14.8097 17.0625H20.4257C21.6639 17.0625 22.6683 16.058 22.6683 14.8198C22.6683 13.5816 21.6639 12.5771 20.4257 12.5771Z" fill="white"/>
                </g>
              </svg>
              Slack
            </a>
          </div>
          <div class="nav-buttons d-none d-xxl-block">
            <a target="_black" href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon">
              <svg class="me-1" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" fill="#1a1a1c" d="M9 0C4.0275 0 0 4.0275 0 9C0 12.9825 2.57625 16.3463 6.15375 17.5387C6.60375 17.6175 6.7725 17.3475 6.7725 17.1112C6.7725 16.8975 6.76125 16.1888 6.76125 15.435C4.5 15.8513 3.915 14.8837 3.735 14.3775C3.63375 14.1187 3.195 13.32 2.8125 13.1062C2.4975 12.9375 2.0475 12.5212 2.80125 12.51C3.51 12.4987 4.01625 13.1625 4.185 13.4325C4.995 14.7937 6.28875 14.4113 6.80625 14.175C6.885 13.59 7.12125 13.1962 7.38 12.9712C5.3775 12.7463 3.285 11.97 3.285 8.5275C3.285 7.54875 3.63375 6.73875 4.2075 6.10875C4.1175 5.88375 3.8025 4.96125 4.2975 3.72375C4.2975 3.72375 5.05125 3.4875 6.7725 4.64625C7.4925 4.44375 8.2575 4.3425 9.0225 4.3425C9.7875 4.3425 10.5525 4.44375 11.2725 4.64625C12.9938 3.47625 13.7475 3.72375 13.7475 3.72375C14.2425 4.96125 13.9275 5.88375 13.8375 6.10875C14.4113 6.73875 14.76 7.5375 14.76 8.5275C14.76 11.9812 12.6562 12.7463 10.6538 12.9712C10.98 13.2525 11.2613 13.7925 11.2613 14.6363C11.2613 15.84 11.25 16.8075 11.25 17.1112C11.25 17.3475 11.4187 17.6287 11.8688 17.5387C15.4237 16.3463 18 12.9712 18 9C18 4.0275 13.9725 0 9 0Z" fill="white"/>
              </svg>
              Star
            </a>
          </div>
        </div>
      </div>

      <div class="clearfix"></div>

      ${self.body()}

      <div class="footer well border-top">
          <div class="row ms-2 me-3 mt-2">
            <div class="col-5">
              <%block name="header"/>
            </div>
            <div class="col-1 right linkto">
              <a href="https://handbook.vantage.sh/tools/instances/" target="_blank">Documentation</a>
            </div>
            <div class="col-1 linkto">
              <a href="https://instances.vantage.sh/about">About</a>
            </div>
            <div class="col-5 right linkto">
              <span>Updated ${generated_at}. Supported by <a target="_blank" href="https://vantage.sh/">Vantage</a></span>
            </div>
          </div>
      </div>
    </div>

    <!-- Libraries: Bootstrap 5.2 (5.1 has an issue where a black bar appears under the table header on load)
                    jQuery 3.6
                    Datatables 1.12 (Buttons 2.2, Colvis 2.2, Datatables with Bootstrap)
         Configure options and upgrade here: https://datatables.net/download/
    -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/v/bs5/jq-3.6.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/datatables.min.js"></script>
    <script src="/store/store.js" type="text/javascript" charset="UTF-8"></script>

    <!-- Custom JS -->
    <script type="text/javascript">
        % if pricing_json:
          var _pricing = ${pricing_json};
          function get_pricing() {
              // see compress_pricing in render.py for the generation side
              v = _pricing["data"];
              for (var i = 0; i < arguments.length; i++) {
                  if (arguments[i] === "none") {
                    // this is for services like Redshift and OpenSearch which 
                    // do not have multiple 'platforms'. RDS for example has 20 
                    // OS's, and ElastiCache has Memcached and Redis
                    continue;
                  }
                  k = _pricing["index"][arguments[i]];
                  v = v[k];
                  if (v === undefined) {
                      return undefined;
                  }
              }
              return v;
          }
          var _instance_azs = ${instance_azs_json};
          function get_instance_availability_zones(instance_type, region) {
            var region_azs = _instance_azs[instance_type];
            if (region_azs) {
              var azs = region_azs[region];
              if (azs) {
                return azs;
              }
            }
            return [];
          }
        % endif
    </script>

    <script src="/vantage.js" type="text/javascript" charset="UTF-8"></script>
    <script src="/default.js" type="text/javascript" charset="UTF-8"></script>
  </body>
</html>
