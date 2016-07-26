/*
* These variables control special behavior for running gene.iobio education edition, with
* a simplified interface and logic.  For running one of the special educational edition 
* tours (e.g. a guided tour of the gene.iobio app), turn on both isLevelEdu and isLevelEduTour.
*/
var isLevelEdu              = false; // is gene.iobio educational version, simplified version of app
var isLevelEduTour          = false; // is gene.iobio exhibit version, a simplified version of the app w/ guided tour
var hideNextButtonAnim      = true;  // is next button hidden on animations during edu tour?

var hasTimeout              = false; // is a timeout based on n seconds of inactivity used?
var keepLocalStorage        = false; // maintain cache between sessions?

var DEFAULT_BATCH_SIZE      = 5;  // how many genes can be analyzed simultaneously for 'Analyze all'


var eduTourNumber           = "0";
var eduTourShowPhenolyzer   = [true, false];

var EDU_TOUR_VARIANT_SIZE   = 16;

var levelEduImpact = {
	HIGH:      'Harmful',
	MODERATE:  'Probably harmful',
	MODIFIER:  'Probably benign',
	LOW:       'Benign'
}

//
// For the exhibit version, we will restart to the welcome page after n seconds of inactivity
//
var IDLE_INTERVAL = 3000;  // (in milliseconds) Check for inactivity every 5 seconds 
var MAX_IDLE      = 60;    // After 3 minute (e.g. 3 * 60  = 180 seconds), prompt the user about inactivity
var IDLE_RESTART  = 10000; // (in milliseconds) Automatically restart app in no prompt action taken after 10 seconds
var idleTime = 0;
var idlePrompting = false;  // prompt user to continue or just automatically restart session?

//
// URLS
//
var stage_iobio_services    = "nv-green.iobio.io/";
var dev_iobio_services      = "nv-dev.iobio.io/";
var prod_iobio_services     = "nv-prod.iobio.io/";

var new_iobio_services    = isOffline ? serverInstance : dev_iobio_services;
var iobio_services        = (isOffline ? "ws://" : "wss://")  + (isOffline ? serverInstance : prod_iobio_services);
var iobio_http_services   = "http://" + (isOffline ? serverInstance : stage_iobio_services);

var geneiobio_server     = iobio_http_services + "geneinfo/";
var geneToPhenoServer    = iobio_http_services + "gene2pheno/";
var hpoServer            = iobio_http_services + "hpo/";
var phenolyzerServer     = "https://7z68tjgpw4.execute-api.us-east-1.amazonaws.com/dev/phenolyzer/";
var phenolyzerOnlyServer = iobio_http_services + "phenolyzer/";

var OFFLINE_PHENOLYZER_CACHE_URL = isOffline ?  (serverCacheDir) : ("../" + serverCacheDir);
var OFFLINE_CLINVAR_VCF_URL      = isOffline ?  ("http://" + serverInstance + serverCacheDir + "clinvar.vcf.gz") : "https://s3.amazonaws.com/iobio/gene/clinvar/clinvar.vcf.gz";

var EXHIBIT_URL              = 'exhibit.html'
var EXHIBIT_URL1             = 'exhibit-case-complete.html'
var EXHIBIT_URL2             = 'exhibit-cases-complete.html'
