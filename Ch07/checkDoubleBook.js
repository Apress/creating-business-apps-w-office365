// unbind click handler for Save button

var saveBtn;
var saveBtnCallbackId;
var listName = 'Calendar';
var conflictString = "This event conflicts with an existing event. Please find a different date and/or time.";
var startDate;
var startDateTime;
var endDate;
var endDateTime;
var currentTimeZoneOffset = "-06:00";

$(function () {
    saveBtn = $("[id*='diidIOSaveItem']");
    if (saveBtn) {
        saveBtnCallbackId = saveBtn.attr("name");
        saveBtn.unbind('click').click(checkForOverlaps);
    }
});

// override default action
function PreSaveItem() {
    return false;
}

function checkForOverlaps() {
    var txtDateStart = $("[title='Start Time Required Field']");
    var txtDateEnd = $("[title='End Time Required Field']");
    var cboHoursStart = $("#" + $("label:contains('Start Time Required Field Hours')").attr("for"));
    var cboMinutesStart = $("#" + $("label:contains('Start Time Required Field Minutes')").attr("for"));

    if ((txtDateStart.length > 0) && (txtDateEnd.length > 0) && (cboHoursStart.length > 0) && (cboMinutesStart.length > 0)) {
        var dateValStart = txtDateStart.val();
        var hoursValStart = formatHours(cboHoursStart.val());
        var minValStart = cboMinutesStart.val();
        var cboHoursEnd = $("#" + $("label:contains('End Time Required Field Hours')").attr("for"));
        var cboMinutesEnd = $("#" + $("label:contains('End Time Required Field Minutes')").attr("for"));
        var dateValEnd = txtDateEnd.val();
        var hoursValEnd = formatHours(cboHoursEnd.val());
        var minValEnd = cboMinutesEnd.val();
        var startDateString = dateValStart.concat(" ").concat(hoursValStart).concat(":").concat(minValStart);

        startDate = new Date(startDateString);
        startDateTime = startDate.getTime();

        var offset = startDate.getTimezoneOffset();
        var offsetInHours = (offset / 60);

        currentTimeZoneOffset = "-0" + offsetInHours + ":00";

        var endDateString = dateValEnd.concat(" ").concat(hoursValEnd).concat(":").concat(minValEnd);

        endDate = new Date(endDateString);
        endDateTime = endDate.getTime();

        currentId = getCurrentId();

        Shp.Lists.getMonthEvents(listName, startDate, querySucceeded);
    }
    else {
        saveCustomAction();
    }
}

function getCurrentId() {
    var returnVal = null;
    var regex = new RegExp("[\\?&]" + "ID" + "=([^&#]*)");
    var qs = regex.exec(window.location.href);

    if (qs != null) {
        returnVal = qs[1];
    }

    return returnVal;
}

function formatHours(hoursVal) {
    // if 12 hour format, hoursVal will look like this: 11 AM
    // if 24 hour format, hoursVal will look like this: 17:
    var hoursArray;

    if (hoursVal.indexOf(":") > -1) {
        hoursArray = hoursVal.split(":");
    }
    else {
        hoursArray = hoursVal.split(" ");
    }

    var returnHours = (hoursArray[0] - 0);

    if (hoursArray[1] == "PM") { // only relevant for 12 hour regional setting format.
        if (returnHours < 12) { // leave alone for 12 PM
            returnHours = returnHours + 12;
        }
    }
    else {
        if (returnHours == 12) {
            returnHours = 0; // 12 AM needs to be 00
        }
    }

    return returnHours;
}

function querySucceeded(items) {
    // this returns both regular and recurring events that either begin or end on the start date
    // Note that it will not pick up multi-day events that span this date
    var itemId;
    var id;
    var eventStartDate;
    var eventEndDate;
    var eventStartDateString;
    var eventEndDateString;
    var eventStartDateTime;
    var eventEndDateTime;
    var startCalc1;
    var startCalc2;
    var endCalc1;
    var endCalc2;
    var hasConflict = false;

    for (var i = 0; i < items.length; i++) {
        itemId = items[i];
        id = itemId.get_item("ID");

        if (currentId != id) { // can't conflict with ourself
            eventStartDateString = itemId.get_item("EventDate");
            eventEndDateString = itemId.get_item("EndDate");
            eventStartDateString = eventStartDateString.replace(" ", "T").concat(currentTimeZoneOffset); // put in 2015-07-29T13:00:00-7:00 format
            eventEndDateString = eventEndDateString.replace(" ", "T").concat(currentTimeZoneOffset);
            eventStartDate = new Date(eventStartDateString);
            eventEndDate = new Date(eventEndDateString);
            eventStartDateTime = eventStartDate.getTime(); // milliseconds since 1970
            eventEndDateTime = eventEndDate.getTime();
            startCalc1 = (eventStartDateTime <= startDateTime);
            startCalc2 = (startDateTime < eventEndDateTime); // not <= since can start at the same time as the end of the previous event
            endCalc1 = (eventStartDateTime < endDateTime); // not <= since the previous event can end at the start time of this event
            endCalc2 = (endDateTime <= eventEndDateTime);

            hasConflict = (startCalc1 && startCalc2) || (endCalc1 && endCalc2) || (startCalc2 && endCalc1);

            if (hasConflict) {
                break;
            }
        }
    }

    if (hasConflict) {
        alert(conflictString);
    }
    else {
        saveCustomAction();
    }
}

function saveCustomAction() {
    WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(saveBtnCallbackId, "", true, "", "", false, true));
}