<h1>bahgera</h1>

<h2>Requirements</h2>
<ul>
	<li><a href="http://cordova.apache.org/">Apache Cordova</a></li>
	<li><a href="http://www.rfduino.com/">RFDuino</a></li>
</ul>

<h2>Setup</h2>

1. Create cordova project:
<code>cordova create bahgera-cordova com.bahgera Bahgera</code>

2. Go to the bahgera-cordova and add your platform:
<code>
	<br>cordova platform add ios
	<br>cordova platform add amazon-fireos
	<br>cordova platform add android
    <br>cordova platform add blackberry10
    <br>cordova platform add firefoxos
</code>
<br>On Windows platform, other commands might be necessary. Please refer to <a href="http://cordova.apache.org/docs/en/4.0.0//guide_cli_index.md.html#The%20Command-Line%20Interface">Apache Cordova documentation</a>.

3. Add Camera plugin:
<code>cordova plugin add org.apache.cordova.camera</code>

4. Add RFduino plugin:
<code>cordova plugin add com.megster.cordova.rfduino</code>

5. Replace the content of bahgera-cordova/www with the content of this repository. You may use the update.sh script after adapting it to your folder structure.

6. Build the cordova project:
<code>cordova build</code>

<h2>iOS Deployment</h2>

1. Replace the bahgera-cordova/config.xml with bahgera/xcode/config.xml

2. Open bahgera-cordova/platforms/ios/Bahgera.xcodeproj

3. Edit Classes/MainViewController.m

4. Replace the <code>- (void)viewWillAppear:(BOOL)animated</code> method with:
<code>
<br>- (void)viewWillAppear:(BOOL)animated
<br>{
<br>    // View defaults to full size.  If you want to customize the view's size, or its subviews (e.g. webView),
<br>    // you can do so here.
<br>    //Lower screen 20px on ios 7
<br>    if ([[[UIDevice currentDevice] systemVersion] floatValue] >= 7) {
<br>        CGRect viewBounds = [self.view bounds];
<br>        viewBounds.origin.y = 20;
<br>        viewBounds.size.height = viewBounds.size.height - 20;
<br>        self.webView.frame = viewBounds;
<br>    }
<br>    [super viewWillAppear:animated];
<br>}
</code>

