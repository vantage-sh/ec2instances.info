<!DOCTYPE html>

<html lang="en">
  <head>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-TBZCV32');</script>
    <!-- End Google Tag Manager -->

    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <%block name="meta"/>
    <link rel="stylesheet" href="/default.css" media="screen">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/js/bootstrap.bundle.min.js" integrity="sha384-pprn3073KE6tl6bjs2QrFaJGz5/SUsLqktiwsUTF55Jfv3qYSDhgCecCxMW52nD2" crossorigin="anonymous"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
      rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" type="image/png" href="https://assets.vantage.sh/www/favicon-32x32.png">
    <title>${i["Amazon"][1]["value"]} pricing and specs | instances.vantage.sh</title>
    <meta name="description" content="${description}">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  </head>
    
  <body>
    <div class="main">
      <div class="nav">
        <div class="logo-group">
          <a href="/" class="logo">
          <svg width="135" height="28" viewBox="0 0 135 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M6.22202 2.35943C8.52431 0.821087 11.2311 5.29581e-07 14 5.29581e-07C15.8386 -0.000505245 17.6594 0.361272 19.3582 1.06466C21.057 1.76804 22.6005 2.79925 23.9006 4.09937C25.2007 5.39949 26.232 6.94305 26.9354 8.64184C27.6387 10.3406 28.0005 12.1614 28 14C28 16.7689 27.1789 19.4757 25.6406 21.778C24.1022 24.0803 21.9157 25.8747 19.3576 26.9343C16.7994 27.9939 13.9845 28.2712 11.2687 27.731C8.55299 27.1908 6.05845 25.8574 4.10052 23.8995C2.14258 21.9416 0.809206 19.447 0.269013 16.7313C-0.27118 14.0155 0.00606513 11.2006 1.06569 8.64244C2.12532 6.08427 3.91973 3.89777 6.22202 2.35943ZM3.93449 12.1002L8.13488 16.3044C8.17658 16.3477 8.22655 16.3821 8.28183 16.4055C8.33712 16.429 8.39657 16.4411 8.45664 16.4411C8.51671 16.4411 8.57618 16.429 8.63146 16.4055C8.68675 16.3821 8.73672 16.3477 8.77842 16.3044L12.9711 12.1002C13.0549 12.0164 13.1019 11.9027 13.1019 11.7842C13.1019 11.6657 13.0549 11.552 12.9711 11.4682L8.76685 7.26783C8.68302 7.18405 8.56938 7.13699 8.45088 7.13699C8.33237 7.13699 8.2187 7.18405 8.13488 7.26783L3.93449 11.4682C3.85071 11.552 3.80367 11.6657 3.80367 11.7842C3.80367 11.9027 3.85071 12.0164 3.93449 12.1002ZM14.316 21.8497L18.5164 17.6493C18.6002 17.5655 18.6472 17.4518 18.6472 17.3333C18.6472 17.2148 18.6002 17.1012 18.5164 17.0173L14.316 12.8131C14.2322 12.7293 14.1185 12.6823 14 12.6823C13.8815 12.6823 13.7678 12.7293 13.684 12.8131L9.47977 17.0173C9.396 17.1012 9.34893 17.2148 9.34893 17.3333C9.34893 17.4518 9.396 17.5655 9.47977 17.6493L13.684 21.8497C13.7678 21.9335 13.8815 21.9805 14 21.9805C14.1185 21.9805 14.2322 21.9335 14.316 21.8497ZM19.8613 16.3044L24.0616 12.1002C24.1036 12.0589 24.1369 12.0098 24.1597 11.9555C24.1824 11.9013 24.1941 11.843 24.1941 11.7842C24.1941 11.7254 24.1824 11.6671 24.1597 11.6129C24.1369 11.5586 24.1036 11.5095 24.0616 11.4682L19.8613 7.26783C19.7775 7.18405 19.6638 7.13699 19.5453 7.13699C19.4268 7.13699 19.3131 7.18405 19.2293 7.26783L15.0251 11.4682C14.9413 11.552 14.8942 11.6657 14.8942 11.7842C14.8942 11.9027 14.9413 12.0164 15.0251 12.1002L19.2293 16.3044C19.3131 16.3882 19.4268 16.4353 19.5453 16.4353C19.6638 16.4353 19.7775 16.3882 19.8613 16.3044Z" fill="white"/>
              <path d="M37.8921 20.4999V5.8999H41.1721V20.4999H37.8921Z" fill="white"/>
              <path d="M44.1127 20.4999V9.5399H46.6527V12.2803C46.716 11.9779 46.796 11.6978 46.8927 11.4399C47.1861 10.6932 47.626 10.1332 48.2127 9.7599C48.7994 9.38657 49.5127 9.1999 50.3527 9.1999H50.4927C51.7727 9.1999 52.746 9.6199 53.4127 10.4599C54.0927 11.2866 54.4327 12.5466 54.4327 14.2399V20.4999H51.2327V14.0599C51.2327 13.4732 51.0594 12.9932 50.7127 12.6199C50.366 12.2466 49.8994 12.0599 49.3127 12.0599C48.7127 12.0599 48.226 12.2532 47.8527 12.6399C47.4927 13.0132 47.3127 13.5066 47.3127 14.1199V20.4999H44.1127Z" fill="white"/>
              <path d="M57.4596 19.8799C58.3396 20.5199 59.5596 20.8399 61.1196 20.8399C62.1063 20.8399 62.9663 20.6999 63.6996 20.4199C64.4329 20.1266 64.9996 19.7132 65.3996 19.1799C65.7996 18.6332 65.9996 17.9932 65.9996 17.2599C65.9996 16.2466 65.6263 15.4399 64.8796 14.8399C64.1329 14.2399 63.0863 13.8666 61.7396 13.7199L60.8796 13.6399C60.3063 13.5732 59.8929 13.4599 59.6396 13.2999C59.3863 13.1399 59.2596 12.9066 59.2596 12.5999C59.2596 12.2799 59.4063 12.0266 59.6996 11.8399C59.9929 11.6532 60.3863 11.5599 60.8796 11.5599C61.5063 11.5599 61.9796 11.6866 62.2996 11.9399C62.6196 12.1799 62.8063 12.4799 62.8596 12.8399H65.6996C65.6596 11.6666 65.2063 10.7732 64.3396 10.1599C63.4729 9.53324 62.3329 9.2199 60.9196 9.2199C60.0396 9.2199 59.2529 9.35324 58.5596 9.6199C57.8796 9.88657 57.3463 10.2799 56.9596 10.7999C56.5729 11.3199 56.3796 11.9666 56.3796 12.7399C56.3796 13.6732 56.7063 14.4399 57.3596 15.0399C58.0263 15.6399 59.0196 16.0066 60.3396 16.1399L61.1996 16.2199C61.9196 16.2999 62.4196 16.4399 62.6996 16.6399C62.9796 16.8266 63.1196 17.0799 63.1196 17.3999C63.1196 17.7599 62.9329 18.0399 62.5596 18.2399C62.1996 18.4266 61.7396 18.5199 61.1796 18.5199C60.4463 18.5199 59.8929 18.3866 59.5196 18.1199C59.1596 17.8399 58.9529 17.5266 58.8996 17.1799H56.0596C56.1129 18.3399 56.5796 19.2399 57.4596 19.8799Z" fill="white"/>
              <path d="M72.8529 20.6399C71.7462 20.6399 70.8529 20.5066 70.1729 20.2399C69.4929 19.9599 68.9929 19.4999 68.6729 18.8599C68.3662 18.2066 68.2129 17.3266 68.2129 16.2199V11.8799H66.5529V9.5399H68.2129V6.5799H71.1929V9.5399H74.3929V11.8799H71.1929V16.3399C71.1929 16.8599 71.3262 17.2599 71.5929 17.5399C71.8729 17.8066 72.2662 17.9399 72.7729 17.9399H74.3929V20.6399H72.8529Z" fill="white"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M82.9257 18.3885V20.4999H85.4657V13.7799C85.4657 12.7666 85.2657 11.9399 84.8657 11.2999C84.4657 10.6466 83.879 10.1599 83.1057 9.8399C82.3457 9.5199 81.4057 9.3599 80.2857 9.3599C79.899 9.3599 79.4857 9.36657 79.0457 9.3799C78.6057 9.39324 78.179 9.41324 77.7657 9.4399C77.3524 9.46657 76.9923 9.49324 76.6857 9.5199V12.2199C77.099 12.1932 77.559 12.1666 78.0657 12.1399C78.5723 12.1132 79.0657 12.0932 79.5457 12.0799C80.0257 12.0666 80.4124 12.0599 80.7057 12.0599C81.2924 12.0599 81.719 12.1999 81.9857 12.4799C82.2523 12.7599 82.3857 13.1799 82.3857 13.7399V13.7799H80.4057C79.4324 13.7799 78.5723 13.9066 77.8257 14.1599C77.079 14.3999 76.499 14.7799 76.0857 15.2999C75.6724 15.8066 75.4657 16.4599 75.4657 17.2599C75.4657 17.9932 75.6323 18.6266 75.9657 19.1599C76.299 19.6799 76.759 20.0799 77.3457 20.3599C77.9457 20.6399 78.639 20.7799 79.4257 20.7799C80.1857 20.7799 80.8257 20.6399 81.3457 20.3599C81.879 20.0799 82.2924 19.6799 82.5857 19.1599C82.7231 18.9269 82.8365 18.6697 82.9257 18.3885ZM82.3857 16.4399V15.5599H80.3857C79.8257 15.5599 79.3923 15.6999 79.0857 15.9799C78.7924 16.2466 78.6457 16.6132 78.6457 17.0799C78.6457 17.5199 78.7924 17.8799 79.0857 18.1599C79.3923 18.4266 79.8257 18.5599 80.3857 18.5599C80.7457 18.5599 81.0657 18.4999 81.3457 18.3799C81.639 18.2466 81.879 18.0266 82.0657 17.7199C82.2523 17.4132 82.359 16.9866 82.3857 16.4399Z" fill="white"/>
              <path d="M87.9807 20.4999V9.5399H90.5207V12.2803C90.584 11.9779 90.664 11.6978 90.7607 11.4399C91.054 10.6932 91.494 10.1332 92.0807 9.7599C92.6674 9.38657 93.3807 9.1999 94.2207 9.1999H94.3607C95.6407 9.1999 96.614 9.6199 97.2807 10.4599C97.9607 11.2866 98.3007 12.5466 98.3007 14.2399V20.4999H95.1007V14.0599C95.1007 13.4732 94.9274 12.9932 94.5807 12.6199C94.234 12.2466 93.7673 12.0599 93.1807 12.0599C92.5807 12.0599 92.094 12.2532 91.7207 12.6399C91.3607 13.0132 91.1807 13.5066 91.1807 14.1199V20.4999H87.9807Z" fill="white"/>
              <path d="M103.268 20.4199C103.974 20.7266 104.801 20.8799 105.748 20.8799C106.734 20.8799 107.614 20.6932 108.388 20.3199C109.161 19.9332 109.781 19.3999 110.248 18.7199C110.714 18.0266 110.968 17.2266 111.008 16.3199H107.888C107.848 16.6799 107.734 16.9999 107.548 17.2799C107.374 17.5466 107.134 17.7599 106.828 17.9199C106.534 18.0666 106.174 18.1399 105.748 18.1399C105.174 18.1399 104.708 18.0132 104.348 17.7599C104.001 17.4932 103.748 17.1266 103.588 16.6599C103.428 16.1799 103.348 15.6466 103.348 15.0599C103.348 14.4199 103.434 13.8666 103.608 13.3999C103.781 12.9332 104.041 12.5666 104.388 12.2999C104.748 12.0332 105.194 11.8999 105.728 11.8999C106.368 11.8999 106.854 12.0732 107.188 12.4199C107.534 12.7532 107.734 13.1666 107.788 13.6599H110.928C110.874 12.7799 110.621 11.9999 110.168 11.3199C109.714 10.6399 109.108 10.1132 108.348 9.7399C107.588 9.35324 106.714 9.1599 105.728 9.1599C104.821 9.1599 104.014 9.31324 103.308 9.6199C102.614 9.92657 102.034 10.3466 101.568 10.8799C101.101 11.4132 100.748 12.0266 100.508 12.7199C100.268 13.3999 100.148 14.1132 100.148 14.8599V15.2399C100.148 15.9599 100.261 16.6599 100.488 17.3399C100.714 18.0066 101.061 18.6066 101.528 19.1399C101.994 19.6732 102.574 20.0999 103.268 20.4199Z" fill="white"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M117.874 20.8799C116.941 20.8799 116.114 20.7199 115.394 20.3999C114.687 20.0799 114.094 19.6532 113.614 19.1199C113.147 18.5732 112.787 17.9666 112.534 17.2999C112.294 16.6199 112.174 15.9266 112.174 15.2199V14.8199C112.174 14.0866 112.294 13.3866 112.534 12.7199C112.787 12.0399 113.147 11.4332 113.614 10.8999C114.081 10.3666 114.661 9.94657 115.354 9.6399C116.061 9.3199 116.861 9.1599 117.754 9.1599C118.927 9.1599 119.914 9.42657 120.714 9.9599C121.527 10.4799 122.147 11.1666 122.574 12.0199C123.001 12.8599 123.214 13.7799 123.214 14.7799V15.8599H115.209C115.255 16.1848 115.33 16.4848 115.434 16.7599C115.621 17.2399 115.914 17.6132 116.314 17.8799C116.714 18.1466 117.234 18.2799 117.874 18.2799C118.461 18.2799 118.941 18.1666 119.314 17.9399C119.687 17.7132 119.941 17.4332 120.074 17.0999H123.014C122.854 17.8332 122.541 18.4866 122.074 19.0599C121.607 19.6332 121.021 20.0799 120.314 20.3999C119.607 20.7199 118.794 20.8799 117.874 20.8799ZM115.454 13.2599C115.357 13.4931 115.283 13.7531 115.233 14.0399H120.175C120.129 13.7325 120.055 13.4525 119.954 13.1999C119.767 12.7332 119.487 12.3799 119.114 12.1399C118.754 11.8866 118.301 11.7599 117.754 11.7599C117.194 11.7599 116.721 11.8866 116.334 12.1399C115.947 12.3932 115.654 12.7666 115.454 13.2599Z" fill="white"/>
              <path d="M125.635 19.8799C126.515 20.5199 127.735 20.8399 129.295 20.8399C130.281 20.8399 131.141 20.6999 131.875 20.4199C132.608 20.1266 133.175 19.7132 133.575 19.1799C133.975 18.6332 134.175 17.9932 134.175 17.2599C134.175 16.2466 133.801 15.4399 133.055 14.8399C132.308 14.2399 131.261 13.8666 129.915 13.7199L129.055 13.6399C128.481 13.5732 128.068 13.4599 127.815 13.2999C127.561 13.1399 127.435 12.9066 127.435 12.5999C127.435 12.2799 127.581 12.0266 127.875 11.8399C128.168 11.6532 128.561 11.5599 129.055 11.5599C129.681 11.5599 130.155 11.6866 130.475 11.9399C130.795 12.1799 130.981 12.4799 131.035 12.8399H133.875C133.835 11.6666 133.381 10.7732 132.515 10.1599C131.648 9.53324 130.508 9.2199 129.095 9.2199C128.215 9.2199 127.428 9.35324 126.735 9.6199C126.055 9.88657 125.521 10.2799 125.135 10.7999C124.748 11.3199 124.555 11.9666 124.555 12.7399C124.555 13.6732 124.881 14.4399 125.535 15.0399C126.201 15.6399 127.195 16.0066 128.515 16.1399L129.375 16.2199C130.095 16.2999 130.595 16.4399 130.875 16.6399C131.155 16.8266 131.295 17.0799 131.295 17.3999C131.295 17.7599 131.108 18.0399 130.735 18.2399C130.375 18.4266 129.915 18.5199 129.355 18.5199C128.621 18.5199 128.068 18.3866 127.695 18.1199C127.335 17.8399 127.128 17.5266 127.075 17.1799H124.235C124.288 18.3399 124.755 19.2399 125.635 19.8799Z" fill="white"/>
          </svg>
          </a>
          <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon contr-mobile">
            <svg class="me-1" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M9 0C4.0275 0 0 4.0275 0 9C0 12.9825 2.57625 16.3463 6.15375 17.5387C6.60375 17.6175 6.7725 17.3475 6.7725 17.1112C6.7725 16.8975 6.76125 16.1888 6.76125 15.435C4.5 15.8513 3.915 14.8837 3.735 14.3775C3.63375 14.1187 3.195 13.32 2.8125 13.1062C2.4975 12.9375 2.0475 12.5212 2.80125 12.51C3.51 12.4987 4.01625 13.1625 4.185 13.4325C4.995 14.7937 6.28875 14.4113 6.80625 14.175C6.885 13.59 7.12125 13.1962 7.38 12.9712C5.3775 12.7463 3.285 11.97 3.285 8.5275C3.285 7.54875 3.63375 6.73875 4.2075 6.10875C4.1175 5.88375 3.8025 4.96125 4.2975 3.72375C4.2975 3.72375 5.05125 3.4875 6.7725 4.64625C7.4925 4.44375 8.2575 4.3425 9.0225 4.3425C9.7875 4.3425 10.5525 4.44375 11.2725 4.64625C12.9938 3.47625 13.7475 3.72375 13.7475 3.72375C14.2425 4.96125 13.9275 5.88375 13.8375 6.10875C14.4113 6.73875 14.76 7.5375 14.76 8.5275C14.76 11.9812 12.6562 12.7463 10.6538 12.9712C10.98 13.2525 11.2613 13.7925 11.2613 14.6363C11.2613 15.84 11.25 16.8075 11.25 17.1112C11.25 17.3475 11.4187 17.6287 11.8688 17.5387C15.4237 16.3463 18 12.9712 18 9C18 4.0275 13.9725 0 9 0Z" fill="black"/>
            </svg>
            Star
          </a>
        </div>
        <a href="https://www.vantage.sh/features/autopilot" class="vantage fw-semibold">Save 50%+ on AWS with Autopilot -></span></a>
        <div class="nav-buttons">
          <a href="https://github.com/vantage-sh/ec2instances.info" class="btn btn-github btn-icon">
            <svg class="me-1" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M9 0C4.0275 0 0 4.0275 0 9C0 12.9825 2.57625 16.3463 6.15375 17.5387C6.60375 17.6175 6.7725 17.3475 6.7725 17.1112C6.7725 16.8975 6.76125 16.1888 6.76125 15.435C4.5 15.8513 3.915 14.8837 3.735 14.3775C3.63375 14.1187 3.195 13.32 2.8125 13.1062C2.4975 12.9375 2.0475 12.5212 2.80125 12.51C3.51 12.4987 4.01625 13.1625 4.185 13.4325C4.995 14.7937 6.28875 14.4113 6.80625 14.175C6.885 13.59 7.12125 13.1962 7.38 12.9712C5.3775 12.7463 3.285 11.97 3.285 8.5275C3.285 7.54875 3.63375 6.73875 4.2075 6.10875C4.1175 5.88375 3.8025 4.96125 4.2975 3.72375C4.2975 3.72375 5.05125 3.4875 6.7725 4.64625C7.4925 4.44375 8.2575 4.3425 9.0225 4.3425C9.7875 4.3425 10.5525 4.44375 11.2725 4.64625C12.9938 3.47625 13.7475 3.72375 13.7475 3.72375C14.2425 4.96125 13.9275 5.88375 13.8375 6.10875C14.4113 6.73875 14.76 7.5375 14.76 8.5275C14.76 11.9812 12.6562 12.7463 10.6538 12.9712C10.98 13.2525 11.2613 13.7925 11.2613 14.6363C11.2613 15.84 11.25 16.8075 11.25 17.1112C11.25 17.3475 11.4187 17.6287 11.8688 17.5387C15.4237 16.3463 18 12.9712 18 9C18 4.0275 13.9725 0 9 0Z" fill="black"/>
            </svg>
            Star
          </a>
        </div>
      </div>
      <div class="columns">
        <div class="column-left--parent">
          <div class="column-left">
            <h1 class="h3 mb-0 fw-bolder">${i["Amazon"][1]["value"]}</h1>
            
            <!-- Description -->
            <p class="py-md-4 py-3 mb-2 small lh-base">${description}</p>
            
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
                  <option value='us-east-1'>US East (N. Virginia)</option>
                  <option value='af-south-1'>Africa (Cape Town)</option>
                  <option value='ap-east-1'>Asia-Pacific (Hong Kong)</option>
                  <option value='ap-south-1'>Asia-Pacific (Mumbai)</option>
                  <option value='ap-northeast-3'>Asia-Pacific (Osaka)</option>
                  <option value='ap-northeast-2'>Asia-Pacific (Seoul)</option>
                  <option value='ap-southeast-1'>Asia-Pacific (Singapore)</option>
                  <option value='ap-southeast-2'>Asia-Pacific (Sydney)</option>
                  <option value='ap-southeast-3'>Asia-Pacific (Jakarta)</option>
                  <option value='ap-northeast-1'>Asia-Pacific (Tokyo)</option>
                  <option value='ca-central-1'>Canada (Central)</option>
                  <option value='eu-central-1'>Europe (Frankfurt)</option>
                  <option value='eu-west-1'>Europe (Ireland)</option>
                  <option value='eu-west-2'>Europe (London)</option>
                  <option value='eu-west-3'>Europe (Paris)</option>
                  <option value='eu-north-1'>Europe (Stockholm)</option>
                  <option value='eu-south-1'>Europe (Milan)</option>
                  <option value='me-south-1'>Middle East (Bahrain)</option>
                  <option value='me-central-1'>Middle East (UAE)</option>
                  <option value='sa-east-1'>South America (S&atilde;o Paulo)</option>
                  <option value='us-east-2'>US East (Ohio)</option>
                  <option value='us-west-1'>US West (California)</option>
                  <option value='us-west-2'>US West (Oregon)</option>
                  <option value='us-gov-west-1'>AWS GovCloud (US-West)</option>
                  <option value='us-gov-east-1'>AWS GovCloud (US-East)</option>
                </select>
              </div>
              <div class="col-6 mb-2">
                <select class="form-select form-select-sm" id="os">
                  <option value="linux">Linux</option>
                  <option value="mswin">Windows</option>
                  <option value="rhel">Red Hat</option>
                  <option value="sles">SUSE</option>
                  <option value="linuxSQL">Linux SQL Server</option>
                  <option value="linuxSQLWeb">Linux SQL Server for Web</option>
                  <option value="linuxSQLEnterprise">Linux SQL Enterprise</option>
                  <option value="mswinSQL">Windows SQL Server</option>
                  <option value="mswinSQLWeb">Windows SQL Web</option>
                  <option value="mswinSQLEnterprise">Windows SQL Enterprise</option>
                  <option value="rhelSQL">Red Hat SQL Server</option>
                  <option value="rhelSQLWeb">Red Hat SQL Web</option>
                  <option value="rhelSQLEnterprise">Red Hat SQL Enterprise</option>
                </select>
              </div>
              <div class="col-6 pe-2">
                <select class="form-select form-select-sm" id="unit">
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                  <option value="week">Per Week</option>
                  <option value="month">Per Month</option>
                  <option value="year">Per Year</option>
                </select>
              </div>
              <div class="col-6">
                <select class="form-select form-select-sm" id="term">
                  <option value="Standard.noUpfront">No Upfront</option>
                  <option value="Standard.partialUpfront">Partial Upfront</option>
                  <option value="Standard.allUpfront">All Upfront</option>
                  <option value="Convertible.noUpfront">No Upfront (Convertible)</option>
                  <option value="Convertible.partialUpfront">Partial Upfront (Convertible)</option>
                  <option value="Convertible.allUpfront">All Upfront (Convertible)</option>
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
                    % if f["name"] == i["Amazon"][1]['value']:
                    <tr class="no-link">
                      <td>${f["name"]}</td>
                    % else:
                    <tr>
                      <td><a href="/aws/ec2/${f["name"]}">${f["name"]}</a></td>
                    % endif
                    <td class="text-center">${f["cpus"]}</td>
                    <td class="text-center">${f["memory"]}</td>
                  </tr>
                  % endfor
                </tbody>
              </table>
            </div>

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
                    % if v[0] == i["Amazon"][1]['value']:
                      <tr class="no-link">
                        <td>${v[0]}</td>
                    % else:
                      <tr>
                        <td><a href="/aws/ec2/${v[1]}">${v[0]}</a></td>
                    % endif
                    </tr>
                  % endfor
                </tbody>
              </table>
            </div>
            % endif
          </div>

          <div class="column-middle mb-5">
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
        </div>
        <div class="column-right">
          <div class="sidebar-section links">
            <div class="d-flex align-items-center mb-2">
              <span class="material-icons me-1">link</span>
              <p class="h6 fw-semibold mb-0">Links</p>
            </div>
            <ul class="list-unstyled">
            % for link in links:
              % if link["title"]:
                <li class="mb-2">
                  <a class="small text-decoration-none mb-1 d-inline-block" href="${link["url"]}" target="_blank">${link["title"]}</a>
                  <p class="fs-12 mb-0 d-block text-muted">${link["date"]}</p>
                </li>
              % endif
            % endfor
            </ul>
            <details>
              <summary class="small text-muted mb-3">
                Submit a Link
              </summary>
              <div class="github-login mb-3">
                <p class="lh-base fw-semibold">Submitting a Link</p>
                <ol class="lh-base ps-4">
                  <li>Click <span class="fw-semibold">Fork this Repository</span>
                  <li>Find <span class="fw-semibold">${i["Amazon"][1]['value']}</span> in the file
                  <li>Insert a link, title, and date.
                </ol>
                <p class="mb-0 lh-base">To review, click <span class="fw-semibold">Propose Changes</span> and then click <span class="fw-semibold">Create pull request</span>.</p>
                <div class="d-grid">
                  <a class="btn btn-white mt-3" href="https://github.com/vantage-sh/ec2instances.info/edit/master/community_contributions.yaml" target="_blank">Submit a Link</a>
                </div>
              </li>
            </details>
          </div>
          <div class="sidebar-section ticket small">
            See a data problem? <a href="https://github.com/vantage-sh/ec2instances.info/issues/new" target="_blank" class="text-decoration-none">Open a ticket.</a>
          </div>
        </div>
      </div>
    </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js" type="text/javascript" charset="utf-8"></script>
  <script src="/bootstrap/js/bootstrap.min.js" type="text/javascript" charset="utf-8"></script>
  <script type="text/javascript">
  $(function() {
    initialize_prices();

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
      if (price_value === "N/A") {
        $('#' + element).html('N/A');
      } else if (price_value < .99) {
        $('#' + element).html("&dollar;" + price_value.toFixed(4));
      }
      else if (price_value > 99 && price_value <= 9999) {
        $('#' + element).html("&dollar;" + price_value.toFixed(2));
      }
      else if (price_value > 9999) {
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
        'hour': 1,
        'day': 24,
        'week': 7 * 24,
        'month': 730,   // use AWS convention of 730 hrs/month
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