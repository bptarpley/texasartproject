const siteHeaderTemplate = (params) => `
    <nav class="navbar navbar-expand-lg container">
        <div class="container-fluid justify-content-between">
            <a class="navbar-brand" href="/">Texas Art Project</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#tap-navbar" aria-controls="tap-navbar" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="tap-navbar">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="/about/">About Us</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/events/">Events</a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            Exhibits
                        </a>
                        <div class="dropdown-menu">
                            <b class="dropdown-item">Buck Schiwetz</b>
                            <hr class="dropdown-divider">
                            <a class="dropdown-item" href="/schiwetz/essay/">Introductory Essay</a>
                            <a class="dropdown-item" href="/schiwetz/home/">Gallery</a>
                            <a class="dropdown-item" href="/schiwetz/map/">Map and Timeline</a>
                            
                            <hr class="dropdown-divider">
                            <b class="dropdown-item">Dallas Women's Gallery</b>
                            <hr class="dropdown-divider">
                            <a class="dropdown-item" href="/dwg">Home</a>
                            <a class="dropdown-item" href="/dwg/ephemera">Ephemera Database</a>
                            <a class="dropdown-item" href="/dwg/timeline">Interactive Timeline</a>
                        </div>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/contact/">Contact Us</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
`

const siteFooterTemplate = (params) => `
    <div id="tap-footer-row" class="d-flex flex-wrap container">
        <div class="tap-footer-cell">
            Texas Art Project © <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" class="tap-footer-link" target="_blank">CC BY-NC-SA 4.0</a>
        </div>
        <div class="tap-footer-cell">
            <img src="img/codhr-footer-logo.png"
            style="height: 50px; width: auto; background-color: #FFFFFF; padding: 5px;"
            alt="The Center of Digital Humanities Research at Texas A&M University" />
        </div>
        <div class="tap-footer-cell">
            <img src="img/pvfa-footer-logo.png"
            style="height: 50px; width: auto; background-color: #FFFFFF; padding: 5px; padding-right: 17px;"
            alt="Performance, Visualization & Fine Arts Texas A&M University" />
        </div>
        <div class="tap-footer-cell">
            <a href="#tap-header-div" class="tap-footer-link ml-auto">^ Back to Top</a>
        </div>
    </div>
`