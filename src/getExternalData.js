var fs = require('fs')

try {
  fs.mkdirSync('tmp')
} catch(e) {}
try {
  fs.mkdirSync('tmp/apps')
} catch(e) {}

var child_process = require('child_process')

var curl = process.env.CURL || '\\projects\\curl\\src\\curl.exe' || 'c:\\progenv\\curl\\src\\curl.exe' || process.env.CURL

// var prompt = require('prompt') // user prompting
// runs a command
function cmd (sCommand) {
  return new Promise(function (fnResolve, fnReject) {
    console.log('executing cmd ...' + sCommand)
    child_process.exec(sCommand, (error, stdout, stderr) => {
      if (!error) {

        // console.log(stdout)
        // console.log(stderr)
        console.log('resolve')
        fnResolve(stdout)
      } else {
        console.log('error' + error)
        fnReject(error);
      }
    })
  })
}

var totaldelay = 0
var delta = 500

function getOrRead (filename, url, delay) {
  delay = delay || 0

  return new Promise(function (fnResolve, fnReject) {
    var u = fs.readFile(filename, function (err, res) {
      if (err) {
        totaldelay = totaldelay + delta
        setTimeout(function () {
          cmd(curl + ' ' + url + ' >' + filename + ' 2>' + filename + '.err.txt').then(res => {
            fs.readFile(filename, function (err, res) {
              if (err) {
                console.log(err + 'read filename ' + filename + ' after download failed ' + url)
                if (!sloppy) {
                  process.exit(-1)
                }
                fnReject(err)
              }
              fnResolve('' + res)
            })
          }
          ).catch(err => {
            console.log(err)
            console.log('optainign data via url' + url + 'failed')
            if (!sloppy) {
              process.exit(-1)
            }
            fnReject(err)
          }
          )
        }, totaldelay)
      } else {
        console.log('read file :-) ' + filename)
        fnResolve(res)
      }
    })
  })
}

function makeCleanNameOld (appId, releaseId) {
  var cleanname = '____' + appId + '_' + releaseId
  cleanname = cleanname.replace(/[^A-Z0-9]/g, '_')
  return cleanname
}

function makeCleanName (appId, releaseId) {
  var cleanname = '____' + appId + '_' + releaseId
  cleanname = cleanname.replace(/-/g, '_dash_')
  cleanname = cleanname.replace(/\(/g, '_parl_')
  cleanname = cleanname.replace(/[)]/g, '_parr_')
  cleanname = cleanname.replace(/\\/g, '_bslash_')
  cleanname = cleanname.replace(/\|/g, '_bar_')
  cleanname = cleanname.replace(/\=/g, '_equal_')
  cleanname = cleanname.replace(/\}/g, '_bracel_')
  cleanname = cleanname.replace(/\{/g, '_bracer_')
  cleanname = cleanname.replace(/\//g, '_')
  cleanname = cleanname.replace(/\./g, '_dot_')
  cleanname = cleanname.replace(/\$/g, '_dollar_')
  cleanname = cleanname.replace(/[^A-Za-z0-9\-]/g, '_')
  return cleanname
}

// / blending results together

var aExtract = ['appId', 'AppName', 'ApplicationComponent', 'RoleName',
  'ApplicationType', 'BSPName', 'BSPApplicationURL', 'releaseName', 'releaseId',
  'BusinessCatalog', 'TechnicalCatalog',
  'TechnicalCatalogDescription']

// the follwing proeprties are to be taken from teh details section (if present)
var aExtractDetails = ['appId', 'AppName', 'ApplicationComponent', 'RoleName',
  'ApplicationType', 'BSPName', 'BSPApplicationURL', 'releaseName', 'releaseId',
  'isPublished',
  'BSPPackage',
  'AppDocumentationLinkKW',
  'AppDocumentaitonLink',
  'BusinessRoleName',

  'BusinessCatalogName',
  'BusinessCatalogDescription',
  'BusinessGroupName',
  'BusinessGroupDescription',

  'UITechnology',


  'LeadingTransactionCodes',
  'TransactionCodes',

  'PrimaryODataServiceName',
  'SemanticObject',
  'SemanticAction',
  'WebDynproC',
  'FrontendSoftwareComponent',
  'FrontendSoftwareComponentMinimumSPLevel',
  'BackendSoftwareComponent',
  'BackendSoftwareComponentMinimumSPLevel',
  'URLParameters',
  'LPDCustRoelName',
  'LPDCustInstance',
  'PrimaryODataPFCGRole',
  'BusinessCatalog', 'TechnicalCatalog', 'ExternalReleaseName'];


function calcUITechnology(o) {
	if(o.UITechnology === "n/a") {
		if(o.ApplicationType === "Factsheet") {
			o.UITechnology = "UI5";
		}
		if(o.ApplicationType === "Reuse Component") {
			o.UITechnology = "UI5";
		}
		if(o.ApplicationType === "GUI") {
			o.UITechnology = "GUI"
		}
		if(o.BSPApplicationURL !== "n/a") {
			o.UITechnology = "UI5";
		}
	}
	return;
}

function filterAndMergeDetails (full) {
  var extract = full.map(function (oResult) {
    var res = {
	  uri : `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('${oResult.appId}')/${oResult.releaseId}`
	  //uri: oResult.__metadata.uri
    }
    aExtract.forEach(function (sKey) {
      res[sKey] = oResult[sKey]
    })
    if (res.releaseId && res.appId) {
      var filename = 'tmp/apps/' + makeCleanName(res.appId, res.releaseId)
      + '.json'
      var rx = {d: { __metadata: {}}}
      try {
        var r = '' + fs.readFileSync(filename, 'utf8')
        rx = JSON.parse(r)
      } catch (e) {
		  console.log('error parsing' + filename);
	  }
      if (rx.d) {
        res.detailsurl = rx.d.__metadata.uri
        aExtractDetails.forEach(function (sKey) {
          if (!res[sKey]) {
            res[sKey] = rx.d[sKey]
          }
        })
      } else {
        console.log(JSON.stringify('what d? ' + JSON.stringify(rx)))
      }
    }
	calcUITechnology(res);
    return res
  });
  return extract;
}

function makeKey (o) {
  return o.appId + '/' + o.releaseId
}



var NULL_MARK = 'n/a';

//var transact = JSON.parse(transactions);

function divideValue(string) {
  var res = string;
  //console.log(string);
  for(var i = 2; i < 10 && i < string.length && (string.length/i > 4); ++i) {
    if( i * Math.round(string.length/i) === string.length  ) {
      var segment = string.substring(0, string.length/i);
     // console.log('analyzing ' + segment);
      var len = segment.length;
      for(var k = 0; (k < i -1 ) && (string.substring((k+1)*len, (k+2)*(len)) === segment) ; ++k) {
        /*emtpy*/
      }
      if(k === i - 1) {
			//	console.log('got it' + segment);
        res = segment;
      }
    }
  }
  return res;
}



var forceAlias = {
	"releaseName" : {
		"Wave 6" : "Delivery Q4/2014",
		"Wave 7" : "Delivery Q1/2015",
		"Wave 8" : "Delivery Q2/2015",
		"Wave 9" : "Delivery Q3/2015",
		"Wave 10" : "Delivery Q4/2015",
		"Wave 11" : "Delivery Q1/2016",
		"Wave 12" : "Delivery Q2/2016",
		"Wave 13" : "Delivery Q3/2016"
}
};

var ExposedProperties = {
	"uri" : "",
    "fiori intent": "#Planne-displayF",
    "appId": "F0238",
    "AppName": "Planned Order",
    "ApplicationComponent": "PP-FIO-MRP",
    "RoleName": "Production Planner",
    "ApplicationType": ["AppType"],
    "BSPName": "BSCBN_ANF_PP",
    "BSPApplicationURL": "/sap/bc/ui5_ui5/ui2/ushell/resources/sap/ushell/components/factsheet",
    "releaseName": "Delivery Q3/2016",
    "releaseId": "W13",
    "BusinessCatalog": "Without Catalog Assignment",
    "TechnicalCatalog": "SAP_PP_TC_F",
    "detailsurl": "https://boma0d717969.hana.ondemand.com:443/sap/fix/externalViewer/services/SingleApp.xsodata/Details(fioriId='F0238',releaseId='W13')",
    "isPublished": "Published",
    "BSPPackage": "BSCBN_UI_ANF_PP",
    "AppDocumentationLinkKW": "_null_",
    "BusinessRoleName": "_null_",
    "BusinessGroupName": "_null_",
    "BusinessGroupDescription": "_null_",
    "PrimaryODataServiceName": "CB_PLANNED_ORDER_SRV",
    "SemanticObject": "Planne",
    "SemanticAction": "displayF",
    "FrontendSoftwareComponent": "UIEAAP01 100",
    "TransactionCodes": "_null_",
    "URLParameters": "_null_",
    "LPDCustInstance": "FACTSHEETS",
    "PrimaryODataPFCGRole": "SAP_PP_PLANNEDORDER_APP",
    "ExternalReleaseName": "Delivery Q3/2016",
	"ArtifactId": "ArtifactId",
	"ProjectPortalLink" : "ProjectPortalLink"
};

var copyOrCheck = [
	"ArtifactId",
"SuccessorAppID",
"PrimaryODataServiceName",
"PredecessorAppID"];



var propagateKey = {
	"LeadingTransactionCodes" : "TransactionCode",
	"TransactionCodes" : "TransactionCode"
};

var mapKeys = {
	UITechnology : { "SAP GUI TRANSACTION" : "GUI" ,
					"SAP Fiori (SAPUI5)" : "UI5",
					"SAP Smart Business Tile & Custom Drill Down App" : "UI5",
					"SAP Smart Business generic Drill Down App" : "UI5",
					"SAP Fiori elements" : "UI5",
					"Native UI5" : "UI5",
					"GUI" : "GUI",
					"Generic UI5 Application Log Framework" : "UI5",
					"SAP Fiori elements: Overview Page" : "UI5",
					"Generic UI5 Job Scheduling Framework" : "UI5",
					"Design Studio (Planning)" : "UI5",
					"Design Studio (Reporting)" : "UI5",
					"Generic UI5 Configuration Framework": "UI5",
					"SAP Fiori: My Inbox" : "UI5",
					"Analysis Path Framework (APF)"  : "UI5",
					"Web Dynpro" : "WebDypnro",
					"UI5" : "UI5"
}
};



function fixOne(obj) {




  var oTrans = obj;
  var objkey = obj.appId + "/" + obj.releaseId;
  Object.keys(obj).forEach(function(sKey) {
	  if (ExposedProperties[sKey] === undefined) {
		  console.log("unknown property " + sKey);
	  }
    obj[sKey] = oTrans[sKey] || NULL_MARK;
		if(forceAlias[sKey] && forceAlias[sKey][obj[sKey]]) {
			obj[sKey] = forceAlias[sKey][obj[sKey]];
		}
    if (sKey === 'SemanticObject' || sKey === 'SemanticAction') {
      var res = divideValue(oTrans[sKey]);
      if(res !== oTrans[sKey]) {
        console.log('fixing duplicate ' + res + ' <= ' + oTrans[sKey]);
      }
      obj[sKey]  = res;
    }
    if( obj.SemanticObject && obj.SemanticObject !== NULL_MARK && obj.SemanticAction && obj.SemanticAction !== NULL_MARK) {
      obj['fiori intent'] = '#' + obj.SemanticObject + '-' + obj.SemanticAction;
    } else {
      obj['fiori intent'] = 'n/a';
    }
  });

  calcUITechnology(obj);

  Object.keys(propagateKey).forEach(function(oldKey) {
	  var newKey = propagateKey[oldKey];
	  if(obj[oldKey] && (!obj[newKey] || obj[newKey] === "n/a")) {
		  obj[newKey] = obj[oldKey];
	  }
  });

  Object.keys(mapKeys).forEach(sKey => {
	if(obj[sKey]) {
		if(!mapKeys[sKey][obj[sKey]]) {
			console.log(` unknown value for ${sKey} in ${objkey} : ${obj[sKey]}`);
			process.exit(-1);
		} else {
			obj[sKey] = mapKeys[sKey][obj[sKey]];
		}
	}
  });

  obj["AppKey"] = obj.appId + "/" + obj.releaseId;
  return obj;
}

function trim(a) {
	while (a.charAt(0) === ' ') {
	 a = a.substring(1);
	}
	while(a.charAt(a.length-1) === ' ') {
		a = a.substring(0,a.length-1);
	}
	return a;
}


function sortSync(propa, propb, obj) {
	if(!(obj[propa] && obj[propb])) {
		return;
	}
	var valsa = obj[propa].split(",");
	var valsb = obj[propb].split(",");
	console.log("prior " + obj[propa]);
	console.log("prior " + obj[propb]);

	valsa = valsa.map(s => trim(s));
	valsb = valsb.map(s => trim(s));
	if(valsa.length !== valsb.length) {
		return;
	}
	if(valsa.length < 2) {
		return;
	}
	asorted = valsa.slice();
	asorted.sort();
	var bsorted = [];
	var seen = {};
	asorted.forEach(function(o) {
		var i = valsa.indexOf(o);
		if( i < 0) {
			console.log("did not find entry !? " + "");
			process.exit(-1);
		}
		if(seen[i]) {
			for(var k = i + 1 ; k < valsa.length; ++k) {
				if(!seen[k]) {
					if(valsa[k] === o) {
						i = k;
						k = valsa.length + 2;
					}
				}
			}
		}
		seen[i] = 1;
		bsorted.push(valsb[i]);
	});
	obj[propa] = asorted.join(", ");
	obj[propb] = bsorted.join(", ");
	console.log("resorted " + obj[propa]);
	console.log("resorted " + obj[propb]);
	//process.exit(-1);
}




var removeProps = [
	"TransactionCodes",
	"AppDocumentaitonLink",
	"LeadingTransactionCodes"
];

var knownProp = {};


cmpprops = [
	"__APPKEY",
	"__APPKEY1",
	"__APPKEY2",
	"__APPKEY3",
	"__APPKEY4",
	"__APPKEY5",
	"__APPKEY6",
	"__APPKEY7",
	"Z_APPKEY8",
	"Z_APPKEY9",
	"Z_APPKEY10",
	"Z_APPKEY18",
	"Z_APPKEY19",
	"Z_APPKEY10",
	"Z_APPKEY18",
	"Z_APPKEY39",
	"Z_APPKEY10"
];

cmpprops = [];


var diffcnt = 0;

function blendOne (n, o) {
  if (!o) {

	Object.keys(n).forEach(key => {
	  if(!knownProp[key]) {
		  delete n[key];
	  }
	});
	removeProps.forEach(a =>
		delete n[a]
	);
    console.log('new object, no prior' + makeKey(n))
    return n
  }
  Object.keys(o).forEach(function (p) {
	if(o[p].indexOf("https://boma0d717969.hana.ondemand.com") === 0) {
		o[p] = o[p].replace("https://boma0d717969.hana.ondemand.com", "https://fioriappslibrary.hana.ondemand.com");
	}
    if (!n[p]) {
      console.log(`propagating  new property ${p} : ` + o[p])
      n[p] = o[p]
    } else if (n[p] != o[p]) {
		diffcnt += 1;
      console.log(`different value for ${p} : ${n[p]} <> ${o[p]}`);
	  if(n[p] === "n/a") {
		  n[p] = o[p];
	  }
    }
  })
  Object.keys(n).forEach(key => {
	  if(!o[key] && n[key] === "n/a") {
		  delete n[key];
	  }
	  if(!knownProp[key]) {
		  delete n[key];
	  }
  });
  removeProps.forEach(a =>
  	delete n[a]
  );
  cmpprops.forEach(key => {
	var uniquekey = n.AppKey + n.AppKey + n.AppKey;
	for(i = 0; i < 10; ++i) {
		uniquekey += Math.random().toString() + new Date().toLocaleString();
	}
	n[key] = n.AppKey + uniquekey;
	o[key] = o.AppKey + uniquekey;
  });

  return n;
}

function blendComparing (fulln, previous) {
  var map = {}
  previous.forEach(o => {
    var nm = makeCleanName(o.appId, o.releaseId)
    map[nm] = o})
  fulln.forEach(function (n) {
    var nm = makeCleanName(n.appId, n.releaseId)
    var nBlended = blendOne(n, map[nm])
  })
  return fulln;
}

function copyIfPresent (key) {
	"use strict";
  var filenameOld = 'tmp/apps/' + makeCleanNameOld(key.appId, key.releaseId) + '.json'
  var fnNew = key.filename + '.json';
  try {
	  try {
		var kx = fs.readFileSync(fnNew);
			//console.log("present " + fnNew);
		try {
			var kddd = JSON.parse('' + kx);
		} catch(par) {
			console.log("fnNew is no json" + fnNew);
			//fs.unlinkSync(fnNew);
			return;
		}
		return;
	}
 	catch(eu) {

	};
    var u = fs.readFileSync(filenameOld);
	try {
    	var k = JSON.parse('' + u);
	} catch(par) {
		console.log("fnold " + filenameOld + " is no json");
		//fs.unlinkSync(filenameOld);
		return;
	}
	k = k.d;
	console.log("got a k" + k.fioriId + "/" + k.releaseId);
    if ((k.fioriId === key.appId) && k.releaseId === key.releaseId) {
      console.log('copying present from ' + filenameOld + ' ' + fnNew)
      fs.writeFileSync(fnNew, JSON.stringify(k))
    }
  } catch(ex) {
	  if(ex.toString().indexOf("ENNT") >= 0) {
		  return;
	  }
	console.log("here ex" + ex);
  }
}

var allKeys = [];
var full = [];

function dumpSortedNice(data,fn, otherdata) {
	var amap = {};
	var othermap = {};
	otherdata.map(obj2 => {
		othermap[obj2.AppKey] = 1;
	});
	var keys = data.map(obj =>  {
		var u = amap[obj.AppKey] = {};
		var props = Object.keys(obj);
		props.sort();
		props.forEach(prop => {
			u[prop] = obj[prop];
		});
		return obj.AppKey;
	});
	keys.sort(function(a,b) {
		if(othermap[a] && !othermap[b]) {
			return -1;
		}
		if(!othermap[a] && othermap[b]) {
			return +1;
		}
		return a.localeCompare(b);
	});
	var res = [];
	keys.forEach(key => {
		res.push(amap[key]);
	});
	fs.writeFileSync(fn, JSON.stringify(res,undefined,2) );
}


mustBeEqual = Object.keys( {
	"AppName": "Report Quality Issue",
    "ApplicationComponent": "QM-FIO",
    "ApplicationType": "Transactional",
    "ArtifactId": "i2d.qm.qualityissue.confirm",
    "BSPApplicationURL": "/sap/bc/ui5_ui5/sap/ui_qm_create",
    "BSPName": "UI_QM_CREATE",
    "BSPPackage": "I2D_QM_QUALITYISSUE_CONFIRM",
    "BusinessCatalog": "SAP_QM_BC_QUALITYENGINEER",
    "BusinessGroupDescription": "Quality Engineer",
    "BusinessGroupName": "SAP_QM_BCG_QUALITYENGINEER",
    "BusinessRoleName": "SAP_QM_BCR_QUALITYENGINEER",
    "FrontendSoftwareComponent": "UIEAAP01 100",
    "LPDCustInstance": "TRANSACTIONAL",
    "PrimaryODataPFCGRole": "SAP_QM_REPORTQUALITYISSUE_APP",
    "PrimaryODataServiceName": "QM_NOTIF_SRV",
    "ProjectPortalLink": "https://projectportal.neo.ondemand.com/projects/i2d.qm.qualityissue.confirm",
    "RoleName": "Quality Engineer",
    "SemanticAction": "create",
    "SemanticObject": "QualityNotification",
    "TechnicalCatalog": "SAP_QM_TC_T",
    "TransactionCode": "n/a",
    "UITechnology": "UI5",
    "URLParameters": "n/a",
    "appId": "F0316",
    "detailsurl": "n/a",
    "fiori intent": "#QualityNotification-create",
    "isPublished": "Published"
});

allowedDifferent = ["uri",
"releaseName",
"releaseId",
"detailsurl",
"FrontendSoftwareComponent",
"AppDocumentationLinkKW",
"ExternalReleaseName",
"AppKey"];


  function filterOld(old, fulln) {

	var present = {};
	var presentAppId = {};
	var oldlen = old.length;
	fulln.map(o =>  {
		present[o.AppKey] = 1;
	});

	old.filter(o => {
		if(present[o.AppKey]) {
			present[o.AppKey] = o;
			presentAppId[o.appId] = o;
			return true;
		}
		return true;
	});

	old = old.filter(o => {
		if(present[o.AppKey]) {
			return true;
		}
		var sameApp = presentAppId[o.appId];
		if(sameApp) {
			var res = mustBeEqual.every(key => (sameApp[key] === o[key]));
			if(res || true) {
				var different = [];
				Object.keys(o).forEach(key =>
					{
						if (sameApp[key] !== o[key]) {
							if(allowedDifferent.indexOf(key) < 0 && o.appId === "F0133") {
								console.log(` ${sameApp.appId} distinct ${key} `);
							}
							different.push(key);
						}
					}
				);
				different.sort();
				different = different.filter(k => (allowedDifferent.indexOf(k) < 0)) ;
				if(different.length) {
					console.log("differnet" + different.join(";"));
				} else {
					return false;
				}
			}
		}
		return true;
	});
	console.log("filtered " + (old.length - oldlen ));
	return old;
  }



getOrRead('tmp/data.json', '-H accept:application/json https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/Apps')
  .then(res => {
    r = JSON.parse(res)
    var keys = r.d.results.map(dat => {
      return {
        appId: dat.appId,
        releaseId: dat.releaseId,
        filename: 'tmp/apps/' + makeCleanName(dat.appId, dat.releaseId)
      }
    });
	full = r.d.results;
    var collision = {}

    keys.forEach(key => {
      if (collision[key.filename]) {
        throw new Error('collision for key' + key.filename + ' ' + key.appId + '/' + key.releaseId + '==' + collision[key.filename])
      }
      collision[key.filename] = key.appId + '/' + key.releaseId
      copyIfPresent(key);
    });
	allKeys = keys;

    // keys = keys.slice(3)
    var aGetApps = keys.map((key, index) => getOrRead(key.filename + '.json' , ` -H accept:application/json https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/Details(fioriId='${key.appId}',releaseId='${key.releaseId}')?$expand=Release_Group%2cGTMScreenshots%2cSuccessors%2cPredecessors%2cODataServices%2cSearchComponent%2cHANAKPIs%2cHANAServices%2cHANARoles%2cNotes%2cRelated_Apps`, 5000)
    )
    return Promise.all(aGetApps)
  }
).catch(err => {
  console.log('error downloading' + err)
  process.exit(-1)
}).then(res => {
  console.log('downloaded all')
  // output some statistics:
  console.log('got ' + allKeys.length + ' distinct apps')

	try {
	fs.mkdirSync('tmp/proc');
	} catch(e) {

	}

	// blend properties together
  fs.writeFileSync('tmp/proc/0_full.json', JSON.stringify(full, undefined, 2));
  var fulln = filterAndMergeDetails(full);
  fs.writeFileSync('tmp/proc/1_filterMerged.json', JSON.stringify(fulln, undefined, 2));
  // correct some
  fulln.map(o => fixOne(o));
  fs.writeFileSync('tmp/proc/2_fixed.json', JSON.stringify(fulln));

  // load exisiting bom files ...
  var old = JSON.parse(fs.readFileSync('old/bom.data.json'));


   old.forEach(o =>  Object.keys(o).forEach(k => {knownProp[k] = 1} ));

  dumpSortedNice(old, 'tmp/old.data.unsorted.json', fulln);

  var asortSync = [
	["BusinessRoleName", "RoleName"],
	["BusinessGroupName", "BusinessGroupDescription"],
  ];
  //sortSync = [];
  asortSync.forEach(so => {
  	old.forEach(o => sortSync(so[0],so[1],o))
  });
  old.forEach(o => {
	if(o.detailsurl && o.detailsurl.indexOf("https://boma0d717969.hana.ondemand.com") === 0) {
		o.detailsurl = o.detailsurl.replace("https://boma0d717969.hana.ondemand.com","https://fioriappslibrary.hana.ondemand.com");
	}
  });



  asortSync.forEach(so => {
  	fulln.forEach(o => sortSync(so[0],so[1],o))
  });
  var blended = blendComparing(fulln, old)
   dumpSortedNice(old, 'tmp/old.data.nonfiltered.json',fulln);
  fs.writeFileSync('tmp/blended.json', JSON.stringify(blended, undefined, 2))

  old = filterOld(old,fulln);
    dumpSortedNice(old, 'tmp/old.data.json',fulln);
  dumpSortedNice(blended, 'tmp/new.data.json',old);
  var presentNew = {};
  blended.forEach(o => presentNew[o.AppKey] = 1);
  old.forEach(o => {
	if(!presentNew[o.AppKey]) {
		blended.push(o);
	}
  });
  dumpSortedNice(blended, 'tmp/bom.data.json',old);



  //
  console.log('diffcnt ' + diffcnt);
  console.log('done')
}).catch(err =>
console.log(err));

if (1 === 0) {
  cmd(curl + ' -H accept:application/json https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/Apps 1>data.json 2>apps_0303.json').catch(
    function (err) {
      console.log(err)
      process.exit(-1)
    }).then(function (src) {
    console.log('reading')
    var src = fs.readFileSync('data.json')
    var data = JSON.parse(src)
    data.d.results.forEach(function (dat, index) {
      if (index < 10) {
        var cleanname = 'data_' + dat.appId + '_' + dat.releaseId
        cleanname = cleanname.replace(/[^A-Z0-9]/g, '_') + '.json'

        console.log(`appId ${dat.appId} releaseId : ${dat.releaseId} ${cleanname}\n`)

        var curlurl = curl + ` -H accept:application/json https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/Details(fioriId='${dat.appId}',releaseId='${dat.releaseId}')?$expand=Release_Group%2cGTMScreenshots%2cSuccessors%2cPredecessors%2cODataServices%2cSearchComponent%2cHANAKPIs%2cHANAServices%2cHANARoles%2cNotes%2cRelated_Apps 1>${cleanname}.json `
        cmd(curlurl).then(function (cmd) {
          console.log('here we go')
        })
      }
    })
    console.log('OK')
  // process.exit(0)
  }).catch(function (err) {
    console.log('erro' + err)
  })
}

if (2 === 0) {
  var src = fs.readFileSync('data.json')
  var data = JSON.parse(src)
  data.d.results.forEach(function (dat, index) {
    if (index < 10) {
      console.log(`appId ${dat.appId} releaseId : ${dat.releaseId} \n`)
      var cleanname = 'data_' + dat.appId + '_' + dat.releaseId
      cleanname = cleanname.replace(/[^A-Z0-9]/g, '_') + '.json'

      var curlurl = curl + ` -H accept:application/json https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/Details(fioriId='${dat.appId}',releaseId='${dat.releaseId}')?$expand=Release_Group%2cGTMScreenshots%2cSuccessors%2cPredecessors%2cODataServices%2cSearchComponent%2cHANAKPIs%2cHANAServices%2cHANARoles%2cNotes%2cRelated_Apps 1>${cleanname}.json 2>${cleanname}.err.txt`

      cmd(curlurl).then(function (cmd) {
        console.log('here we go')
      })
    }
  })
  console.log('OK')
}
