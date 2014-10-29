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
	<div><code>cordova platform add ios</code></div>
	<div><code>cordova platform add amazon-fireos</code></div>
	<div><code>cordova platform add android</code></div>
    <div><code>cordova platform add blackberry10</code></div>
    <div><code>cordova platform add firefoxos</code></div>
On Windows platform, other commands might be necessary. Please refer to <a href="http://cordova.apache.org/docs/en/4.0.0//guide_cli_index.md.html#The%20Command-Line%20Interface">Apache Cordova documentation</a>.

3. Add Camera plugin:
<code>cordova plugin add org.apache.cordova.camera</code>

4. Add RFduino plugin:
<code>cordova plugin add com.megster.cordova.rfduino</code>

5. Replace the content of bahgera-cordova/www with the content of this repository. You may use the update.sh script after adapting it to your folder structure.

6. Build the cordova project:
<code>cordova build</code>

<h2>iOS Deployment</h2>

1. Replace the bahgera-cordova/config.xml with bahgera/xcode/config.xml

2. Replaces all images in bahgera-cordova/platforms/ios/Bahgers/Resources/icons with those in bahgera/xcode/icons

3. Replaces all images in bahgera-cordova/platforms/ios/Bahgers/Resources/splash with those in bahgera/xcode/splash

4. Open bahgera-cordova/platforms/ios/Bahgera.xcodeproj

5. Edit Classes/MainViewController.m

6. Replace the <code>- (void)viewWillAppear:(BOOL)animated</code> method with:
<pre>
<code>- (void)viewWillAppear:(BOOL)animated
	{
		// View defaults to full size.  If you want to customize the view's size, or its subviews (e.g. webView),</code></pre>
<div><code>    // you can do so here.</code></div>
<div><code>    //Lower screen 20px on ios 7</code></div>
<div><code>    if ([[[UIDevice currentDevice] systemVersion] floatValue] >= 7) {</code></div>
<div><code>        CGRect viewBounds = [self.view bounds];</code></div>
<div><code>        viewBounds.origin.y = 20;</code></div>
<div><code>        viewBounds.size.height = viewBounds.size.height - 20;</code></div>
<div><code>        self.webView.frame = viewBounds;</code></div>
<div><code>    }</code></div>
<div><code>    [super viewWillAppear:animated];</code></div>
<div><code>}</code></div>
</pre>

7. Run the project on your iPhone
