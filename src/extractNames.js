var fs = require('fs');


var data = fs.readFileSync('Apps_all_8000.json');


//var data = fs.readFileSync('Apps_100');


var process = require('child_process');

var datajs = JSON.parse(data);


var aExtract= ['appId', 'AppName', 'ApplicationComponent', 'RoleName',
'ApplicationType', 'BSPName', 'BSPApplicationURL', 'releaseName', 'releaseId',
'BusinessCatalog', 'TechnicalCatalog'];


var sensitive = {
    PO : {},
    Translator : {},
    LanguageEditor : {}
};
// PO
// Translator, 
// LanguageEditor 

var aSensitive = ['PO','Translator','LanguageEditor'];

var aExtractDetails= ['appId', 'AppName', 'ApplicationComponent', 'RoleName',
'ApplicationType', 'BSPName', 'BSPApplicationURL', 'releaseName', 'releaseId',
'isPublished',
'BSPPackage',
'AppDocumentationLinkKW',
'AppDocumentaitonLink',
'BusinessRoleName',
'BusinessGroupName',
'BusinessGroupDescription',
'PrimaryODataServiceName',
'SemanticObject',
'SemanticAction',
'WebDynproC',
'FrontendSoftwareComponent',
'FrontendSoftwareComponentMinimumSPLevel',
'BackendSoftwareComponent',
'BackendSoftwareComponentMinimumSPLevel',
'TransactionCodes',
'URLParameters',
'LPDCustRoelName',
'LPDCustInstance',
'PrimaryODataPFCGRole',
'BusinessCatalog', 'TechnicalCatalog', 'ExternalReleaseName'];

var extract = datajs.d.results.map(function (oResult) {
    var res = {
        uri : oResult.__metadata.uri
    };
    aExtract.forEach(function(sKey) {
        res[sKey] = oResult[sKey];
    });
    if (res.releaseName && res.appId) {
        var url = 'https://boma0d717969.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/Details(fioriId=\''
            + res.appId + "',releaseId='" + res.releaseId + "')?$format=json";
        var filename = 'apps/app_' + res.appId + '__' + res.releaseId.replace(/ /g,'_') + ".json";

        if (1 == 0)  {

            process.spawn('c:\\progenv\\curl\\src\\curl.exe',
            [url, "-o", filename]);
        }
        var rx = {d : { __metadata : {}}};
        try {
        var r = '' + fs.readFileSync(filename, 'utf8');
            rx = JSON.parse(r);
        } catch (e) {

        }
        if (rx.d) {
            res.detailsurl = rx.d.__metadata.uri;
            aExtractDetails.forEach(function (sKey) {
                if(!res[sKey]) {
                    res[sKey] = rx.d[sKey];
                }
            });        
            aSensitive.forEach(function(sKey) {
                if (rx.d[sKey]) {
                  sensitive[sKey][rx.d[sKey]] =  rx.d.AppName;
                }
            });
        } else {
            console.log(JSON.stringify("what d? " + JSON.stringify(rx)));
        }
    }
    return res;
});

function stringCompare(a,b) {
    if(a === undefined && b === undefined) {
        return 0;
    }
    if( (a < b) || b === undefined) {
        return -1;
    }
    if (a > b ) {
        return 1;
    }
    return 0;
}

extract.sort(function(a, b) {
    var r = stringCompare(a.AppName, b.AppName);
    if(!r) {
        return r;
    }
    r = stringCompare(a.releaseId, b.releaseId);
    if(!r) {
        return r;
    }
    return 0;
});

//console.log(JSON.stringify(extract, undefined, 2));

console.log(JSON.stringify(sensitive, undefined, 2));

aSensitive.forEach(function(sKey) {
    console.log( sKey + ":" + Object.keys(sensitive[sKey]).length);
});