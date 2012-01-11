function createExhibit() {
    var fDone = function() {
        $("#exhibit-browse-panel").css("display", "block");
        $("#views").css("display", "block");
        
        window.exhibit = Exhibit.create();
        window.exhibit.configureFromDOM();
    };
    
    window.database = Exhibit.Database.create();
    window.database.loadLinks([
        { href: "schema.json", type: "application/json" },
        { href: "presidents.json", type: "application/json" }
    ], fDone);
}