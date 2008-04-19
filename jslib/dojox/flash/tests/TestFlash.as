import DojoExternalInterface;
import ExpressInstall;

class TestFlash{
	private var message:String;
	
	public function TestFlash(){
	}
	
	public static function main(){
		//getURL("javascript:alert('main')");
		trace("main");
		DojoExternalInterface.initialize();
		
		var test = new TestFlash();
		DojoExternalInterface.addCallback("setMessage", test, test.setMessage);
		DojoExternalInterface.addCallback("getMessage", test, test.getMessage);
		DojoExternalInterface.addCallback("multipleValues", 
											test, test.multipleValues);
		
		DojoExternalInterface.done();
	}
	
	public function setMessage(message:String):Void{
		this.message = message;
	}
	
	public function getMessage():String{
		return this.message;
	}
	
	public function multipleValues(key:String, value:String, 
									namespace:String):String{
		return namespace + key + value;
	}
}