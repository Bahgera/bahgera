# bahgera

## Requirements

* <a href="http://cordova.apache.org/">Apache Cordova</a>
* <a href="http://www.rfduino.com/">RFDuino</a>

## iOS Setup

Install Cordova

    $ npm install cordova -g
    

From Bahgera directory:

    $ cordova platform add ios


Install the rfduino plugin

    $ cordova plugin add com.megster.cordova.rfduino
    

Install the Camera plugin

    $ cordova plugin add org.apache.cordova.camera
    

Replace default images with Bahgera images

    $ rm platforms/ios/Bahgera/Resources/icons/*
    $ rm platforms/ios/Bahgera/Resources/splash/*
    $ cp iOS/icons/* platforms/ios/Bahgera/Resources/icons/
    $ cp iOS/splash/* platforms/ios/Bahgera/Resources/splash/

Open Xcode project in Xcode

    $ open platforms/ios/Bahgera.xcodeproj


In Xcode, edit the Classes/MainViewController.m file

Replace the <code>- (void)viewWillAppear:(BOOL)animated</code> method with:

```
- (void)viewWillAppear:(BOOL)animated
{
	// View defaults to full size.  If you want to customize the view's size, or its subviews (e.g. webView),
	// you can do so here.
	//Lower screen 20px on ios 7
	if ([[[UIDevice currentDevice] systemVersion] floatValue] >= 7) {
		CGRect viewBounds = [self.view bounds];
		viewBounds.origin.y = 20;
		viewBounds.size.height = viewBounds.size.height - 20;
		self.webView.frame = viewBounds;
	}
	[super viewWillAppear:animated];
}
```

Deploy to your iPhone

## Android Setup (not tested)


    $ cd cordova-plugin-rfduino/examples/button
    $ cordova platform add android
    $ cordova plugin add com.megster.cordova.rfduino
    $ cordova run

## Usage

TBD
