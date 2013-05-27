describe("better-dateinput-polyfill", function() {
    var calendar, dateinput;

    beforeEach(function() {
        calendar = DOM.mock();
        dateinput = DOM.mock("input[type=date]");

        spyOn(dateinput, "_refreshCalendar");
    });

    it("should toggle calendar visibility on enter key", function() {
        spyOn(dateinput, "getCalendarDate").andReturn(new Date());
        spyOn(dateinput, "get").andReturn("");

        var showSpy = spyOn(calendar, "show"),
            hideSpy = spyOn(calendar, "hide"),
            visibilitySpy = spyOn(calendar, "isHidden");

        visibilitySpy.andReturn(true);

        dateinput._handleDateInputKeys(13, false, calendar);

        expect(visibilitySpy).toHaveBeenCalled();
        expect(showSpy).toHaveBeenCalled();

        visibilitySpy.andReturn(false);

        dateinput._handleDateInputKeys(13, false, calendar);

        expect(visibilitySpy).toHaveBeenCalled();
        expect(hideSpy).toHaveBeenCalled();
    });

    it("should hide calendar on escape or tab key", function() {
        var spy = spyOn(calendar, "hide");

        dateinput._handleDateInputKeys(9, false, calendar);

        expect(spy).toHaveBeenCalled();

        dateinput._handleDateInputKeys(27, false, calendar);

        expect(spy.callCount).toBe(2);
    });

    it("should reset calendar value on backspace or delete keys", function() {
        var spy = spyOn(dateinput, "set");

        spy.andCallFake(function(value) {
            expect(value).toBe("");
        });

        dateinput._handleDateInputKeys(8, false, calendar);

        expect(spy).toHaveBeenCalled();

        dateinput._handleDateInputKeys(46, false, calendar);

        expect(spy.callCount).toBe(2);
    });

    it("should handle arrow keys", function() {
        var now = new Date(),
            getSpy = spyOn(dateinput, "getCalendarDate"),
            setSpy = spyOn(dateinput, "setCalendarDate"),
            expectKey = function(key, altKey, expected) {
                getSpy.andReturn(new Date(now.getTime()));

                dateinput._handleDateInputKeys(key, altKey, calendar);

                expect(setSpy).toHaveBeenCalledWith(expected);
            }

        expectKey(74, false, new Date(now.getTime() + 604800000));
        expectKey(40, false, new Date(now.getTime() + 604800000));
        expectKey(75, false, new Date(now.getTime() - 604800000));
        expectKey(38, false, new Date(now.getTime() - 604800000));
        expectKey(76, false, new Date(now.getTime() + 86400000));
        expectKey(39, false, new Date(now.getTime() + 86400000));
        expectKey(72, false, new Date(now.getTime() - 86400000));
        expectKey(37, false, new Date(now.getTime() - 86400000));
    });

});