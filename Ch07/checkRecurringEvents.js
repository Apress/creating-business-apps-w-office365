// From https://anvlpopescu.wordpress.com/2014/09/06/get-calendar-recurrent-events-with-caml/

Date.toISOFormat = function (date, ignoreTime) {
    /// <summary>Date object static method to format a date to date ISO string - YYYY-MM-DDThh:mm:ssZ</summary>
    /// <param name="date" type="Date" mayBeNull="false" optional="false"></param>
    /// <param name="ignoreTime" type="Boolean" mayBeNull="false" optional="true"></param>
    /// <returns type="String">A string representing ISO format for specied date</returns>

    // If not specified, time is ignored
    var ignoreTime = ignoreTime || {};

    function pad(number) {
        // Add leading 0 if number is less then 10 (enclosed method)
        var r = String(number);
        if (r.length === 1) r = '0' + r;
        return r;
    }

    var Y = date.getFullYear();
    var M = pad(date.getMonth() + 1);
    var D = pad(date.getDate());
    if (ignoreTime === false) return Y + '-' + M + '-' + D + 'T00:00:00Z';


    var h = pad(date.getHours());
    var m = pad(date.getMinutes());
    var s = pad(date.getSeconds());
    return Y + '-' + M + '-' + D + 'T' + h + ':' + m + ':' + s + 'Z';
}

// used for Shp namespace and from checkDoubleBook.js


// Create Shp namespace
var Shp = Shp || {};

Shp.ListItem = function (xmlNode) {
    /// <summary>Object representing list item, built from xml node obtained for lists.asmx web service</summary>
    /// <param name="xmlNode" type="XML" mayBeNull="false" optional="false">XML node for list item</param>
    this.listItem = new Object();
    this._parseResponse(xmlNode);
}

Shp.ListItem.prototype._parseResponse = function (xmlNode) {
    /// <summary>Internal method of ListItem to parse xml node and enclose data into listItem property</summary>
    /// <param name="xmlNode" type="XML" mayBeNull="false" optional="false">XML node for list item</param>
    for (var j = 0; j < xmlNode.attributes.length; j++) {
        var nodeName = xmlNode.attributes[j].nodeName.replace('ows_', '');
        var nodeValue = xmlNode.attributes[j].nodeValue;
        this.listItem[nodeName] = (nodeValue === undefined || nodeValue === null) ? '' : nodeValue;
    }
}

Shp.ListItem.prototype.get_item = function (field) {
    /// <summary>Internal method of ListItem to parse xml node and enclose data into listItem property</summary>
    /// <param name="field" type="String" mayBeNull="false" optional="false">XML node for list item</param>
    var fieldValue = (this.listItem.hasOwnProperty(field) === true) ? this.listItem[field] : '';
    return fieldValue;
}





// Shp.Lists object
Shp.Lists = {};

Shp.Lists._serializeResponse = function (xml) {
    /// <summary>Parse XML server response and convert it into an array of Shp.ListItem objects</summary>
    /// <param name="xml" type="XML" mayBeNull="false" optional="false">A date object. Month data where specified date is included will be returned.</param>
    /// <returns type="Array" elementsType="Shp.ListItem"></returns>

    var items = new Array();
    var rows = xml.getElementsByTagName("z:row");

    if (rows.length == 0) { //Chrome
        rows = xml.getElementsByTagName("row");
    }

    for (var i = 0; i < rows.length; i++) {
        items.push(new Shp.ListItem(rows[i]));
    }
    return items;
}

Shp.Lists.getMonthEvents = function (list, date, callback) {
    /// <summary>Get events from a specified calendar list based on a specified date.</summary>
    /// <param name="listName" type="String" mayBeNull="false" optional="false">Calendar list name</param>
    /// <param name="date" type="Date" mayBeNull="false" optional="false">A date object. Month data where specified date is included will be returned.</param>
    /// <param name="callback" type="Function" mayBeNull="false" optional="false"></param>

    // We set calendar date in the middle of the month. Seems SharePoint Online did not return correct results if I set to first day of month
    var calendarDate = new Date(date.getFullYear(), date.getMonth(), 15);
    var checkDateTime = calendarDate.getTime();
    var month = date.getMonth();
    var year = date.getFullYear();
    var day = date.getDate();

    function isInRange(dateString) {
        /// enclosed function to check if date is in range
        var dt = dateString.split(' ')[0];
        var dateArray = dt.split('-');
        var y = parseFloat(dateArray[0]);
        var m = parseFloat(dateArray[1]) - 1;
        var d = parseFloat(dateArray[2]);
        var inRange = (y === year && m === month && d === day);

        return inRange;
    }

    function isInDuration(startDateString, endDateString) {
        startDateString = startDateString.replace(" ", "T"); // put in 2015-07-29T13:00:00 format
        endDateString = endDateString.replace(" ", "T"); // put in 2015-07-29T13:00:00 format

        var startDate = new Date(startDateString);
        var endDate = new Date(endDateString);
        var startDateTime = startDate.getTime(); // milliseconds since 1970
        var endDateTime = endDate.getTime();
        var inDuration = ((startDateTime <= checkDateTime) && (endDateTime >= checkDateTime));

        return inDuration;
    }


    var caml = "<Query>" +
				   "<Where>" +
					   "<DateRangesOverlap>" +
						   "<FieldRef Name='EventDate' />" +
						   "<FieldRef Name='EndDate' />" +
						   "<FieldRef Name='RecurrenceID' />" +
						   "<Value Type='DateTime' IncludeTimeValue='FALSE'>" +
							   "<Month />" +
							"</Value>" +
						"</DateRangesOverlap>" +
				   "</Where>" +
				   "<OrderBy>" +
					   "<FieldRef Name='EventDate' />" +
					"</OrderBy>" +
			   "</Query>";



    jQuery().SPServices({
        operation: 'GetListItems',
        async: true,
        listName: list,
        CAMLQuery: caml,
        CAMLRowLimit: 100,
        CAMLQueryOptions: '<QueryOptions><DateInUtc>FALSE</DateInUtc><ViewAttributes Scope="RecursiveAll" /><CalendarDate>' + Date.toISOFormat(calendarDate) + '</CalendarDate><IncludeMandatoryColumns>TRUE</IncludeMandatoryColumns><RecurrencePatternXMLVersion>v3</RecurrencePatternXMLVersion><ExpandRecurrence>TRUE</ExpandRecurrence></QueryOptions>',
        completefunc: function (data, status) {
            if (status === 'success') {
                var events = Shp.Lists._serializeResponse(data.responseXML);
                var items = [];
                for (var i = 0; i < events.length; i++) {
                    var start = events[i].get_item('EventDate');
                    var end = events[i].get_item('EndDate');

                    if (isInRange(start) === true || isInRange(end) === true || isInDuration(start, end) === true) {
                        items.push(events[i]);
                    }
                }
                callback(items);
            }
            else {
                alert("Error in reading events for calendar '" + list + ".' Please check that the calendar has not been renamed.");
            }
        }

    });

}