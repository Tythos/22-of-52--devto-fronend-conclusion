# [22/52] Random Software Project: dev.to Frontend Conclusion

## It's Over, Man!

We've reached the final episode of our three-parter on what was once the dev.to frontend challenge. We've gotten quite distracted, haven't we!? While it's far too late to submit for the challenge itself, we've learned some good lessons along the way--and even published a neat little library. But now it's time to wrap it up.

We'll focus mainly on two big things today: integrating our `solarplanets` library to compute the actual 3d positions of our planets in realtime, and finishing the integration of the markup from the original challenge via on-click events for the individual planet meshes.

## Integrating Solar Planets

You might recall from part two that we had put together a decent little `solarplanets` library, based on a useful algorithm from one of my go-to astro texts. We've since used a basic `yarn publish` to put this up on npmjs.org for easy access; it even has [its own project page](https://www.npmjs.com/package/solarplanets) now! Cool.

![our solarplanets project](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hk01hlpmh8vh4h24r43w.png)

We can start with a basic `yarn add solarplanets`, then, from where we left off in part one. Then, we can call `yarn run dev` to get a live version of our app going. And now we're ready to use it!

### Compute Planet Positions

After importing the library, we'll also need the data (or "catalog") of planetary orbit tables to pass to the function call for each planet. We called this the "standish catalog" after the original paper where it was published. We'll copy it over to load as a resource in our app (just a raw import for now is fine), then parse it on application load.

Now, we can update our "planet factory" (`buildPlanet()`) to include a "name" parameter (so we can correlate against this catalog). Then, we'll use the `getRvFromElementsDatetime()` method from our library, if a match is found, to determine the position we assign to that mesh.

```js
const poe = window.app.catalog(hasOwnProperty(name.toLowerCase())
    ? window.app.catalog[name.toLowerCase()]
    : null;
if (pow) {
    const [r, _] = solarplanets.getRvFromElementsDatetime(poe, window.app.now);
    mesh.position.set(
        spatialscale * r[0],
        spatialscale * r[1],
        spatialscale * r[2]
    );
}
```

We'll also add this `window.app.now` Date object, though there is also a [newer `THREE.Clock` feature](https://threejs.org/docs/#api/en/core/Clock) we could use for more cohesive time modeling. And once we've assigned those positions (updating the call to this factory to include the new name parameter as well, of course, in addition to parsing the catalog JSON on window load), we can now see our planetary positions!

![solarplanets positions](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0uap2rjwy4xb6c547w1r.png)

### Sampling Orbit Traces

One thing you may notice is, while our planets have "real" positions now, they don't match the "orbit traces" we had produced lines for. Those are still implemented as "flat" circles, so it's no surprise they don't line up. Let's fix that now.

To compute the orbit trace for a planet, we'll use a similar function call but we'll sample over time from "now" until one orbital period in the future. This orbital period, though, is different for each planet, so we'll need to look at our catalog again. Let's add a "name" parameter to the orbit trace "factory" as well, then dive in and update how those points are being computed.

First, we'll replace the "uniform" sampling with a sampling across time. We'll still use a fixed number of points, but we'll interpolate those from the "now" time to one orbital period into the future. We'll add a helper method to compute this "orbital period" from the catalog model entry, which is a pretty straightforward equation that we've actually looked at in previous articles.

```js
function getPeriodFromPoe(poe) {
    const MU_SUN_K3PS2 = 1.327e11;
    const au2km = 1.49557871e8;
    return 2 * Math.PI * Math.sqrt(Math.pow(poe.a_au * au2km, 3.0) / MU_SUN_K3PS2);
}
```

Now we'll use this to change the `for` loop in the `buildOrbitTrace()` function.

```js
const poe = window.app.catalog.hasOwnProperty(name.toLowerCase())
    ? window.app.catalog[name.toLowerCase()]
    : null;
if (pow) {
    const T0 = window.app.now;
    const T_s = getPeriodFromPoe(poe);
    for (var i = 0; i < (n + 1); i += 1) {
        const t_dt = new Date(T0.valueOf() + T_s * 1e3 * i / n);
        const [r, _] = solarplanets.getRvFromElementsDatetime(poe, t_dt);
        points.push(new THREE.Vector3(
            spatialScale * r[0],
            spatialScale * r[1],
            spatialScale * r[2]
        ));
    }
}
```

And with that you should see some 3d orbit traces now! They're slightly tilted, they're slightly skewed, and they line up with our planet positions. Pretty darn cool.

![3d orbit traces](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/sas4xuhe18fx5f9ug42h.png)

## Finishing Raycaster Collision Detection

When we left off in part one, we had just put in a raycaster to evaluate (on each frame) collisions with meshes in our scene. I have one brief update, which is that the mouse position was not being translated correctly. There was a sign error in the calculation for the `y` component, which should instead look something like this:

```js
window.app.mouse_pos.y = -(event.clientY / window.innerHeight) * 2 + 1;
```

With that fixed, let's debug / verify that these collisions are actually taking place. When intersections are computed (in our `animate()` function), we're going to pass those intersections off to a handler, `processCollision()`. We're also going to count how many intersections are triggered, so we know when to "reset" the mouseover effects we're going to add.

```js
let nTriggered = 0;
if (intersections.length > 0) {
    intersections.forEach(intersection => {
        nTriggered += processCollision(intersection) ? 1 : 0;
    });
}
if (nTriggered === 0) {
    // reset stuff
}
```

With that in mind, we're ready to write our handler. First, let's just check to make sure the mesh has a name. (Which will require, by the way, that we assign the planet name in the `buildPlanet()` factory to the mesh that is created. In this function, we will also need to set a scale for the mesh, like `mesh.scale.set(2, 2, 2)`, to make collisions easier. Make sure you make these changes now.) If it has a name that matches a known planet, we'll log it to the console for now.

```js
function processCollision(intersection) {
    const name = intersection.object.name;
    const names = planets.map(p => p.name.toLowerCase());
    if (name !== "" && names.includes(name)) {
        console.log(name);
        return true;
    }
    return false;
}
```

(Note we are normalizing names to lower case for comparison--always a good idea, just in case you lose track of consistent capitalization within the model data you are using.)

This should be enough for you to see (for example) "venus" should up in your console log when you move the mouse over Venus.

### Trigger Mouseover Effects

With intersections being computed correctly, let's add some effects. Even if the user doesn't click, we want to indicate (as a helpful hint) that the mouse is over something clickable--even though it's a mesh in a 3d scene, and not just a big button in a 2d UI. We're going to make two changes: the mesh will turn white, and the cursor will change to a "pointer" (the hand, instead of the default arrow).

In our `processCollision()` function, we'll replace the `console.log()` call with a change to the object material color, and change the body style of the document (a little cheating here...) to the appropriate style.

```js
//mouseover effects: change planet color, mouse cursor
intersection.object.material.color.set(0xffffff);
window.document.body.style.pointer = "cursor";
return true;
```

We'll also need to use our collision check aggregation (`nTriggered`, in the `animate()` function) to reset these changes when the mouse is *not* hovering over a planet. We had an `if` block for this, let's populate it now:

```js
if (nTriggered === 0) {
    // reset state
    window.document.body.style.cursor = "inherit";
    planets.forEach(p => {
        const sgn = window.app.scene.getObjectByName(p.name.toLowerCase());
        if (sgn) {
            sgn.material.color.set(p.approximateColor_hex);
        }
    });
}
```

Give it a spin! Hover over some planets and check out that deliciousness.

### Trigger On-Click Dialog

To satisfy the original intention (and requirements) of the challenge, we need to integrate the markup. We'll move *all* of this markup into our HTML, but tweak the style to hide it so the 3d canvas continues to take up our screen. Instead, when a planet is clicked, we'll query this markup to display the correct content in a quasi-dialog.

If you copy the entire body of the markup, you can tweak our top-level CSS to make sure it doesn't show up before a mouse button is pressed:

```cs
header, section, article, footer {
    display: none
}
```

And from the console, you can verify that we can use query selector to grab a specific part of this markup:

```js
window.document.body.querySelector("article.planet.neptune");
```

So, we're ready to implement our on-click event. But, we need to keep track of the mouse state--specifically, if the button is down. We'll add an `is_mouse_down` property to our module-scope `window.app` Object, and add some global handlers to our `onWindowLoad()` function that update it:

```js
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
```

The sole purpose of these event handlers is to update that `window.app.is_mouse_down` property so we'll be able to check it in our collision intersection handler. So, they're pretty simple:

```js
function onMouseDown(event) {
    window.app.is_mouse_down = true;
}

function onMouseUp(event) {
    window.app.is_mouse_down = false;
}
```

In a more formally designed application, we might encapsulate management (and lookup) of mouse state (and signals) in their own object. But this will work for our purposes. Now, we're ready to revisit the body of our `processCollision()` handler and add support for showing the dialog:

```js
if (window.app.is_mouse_down) {
    dialogOpen(name);
}
```

We'll add two handlers for dialog management: `dialogOpen()` and `dialogClose()`. The latter will be invoked when the mouse moves *out* of the mesh collision--in other words, exactly where we reset the other UI states, in `animate()`:

```js
if (nTriggered === 0) {
    // ...
    dialogClose();
}
```

Now we're ready to write these. Since we're not using any kind of UI library or framework, we'll manually hand-jam a basic `<div/>` that we populate from the article content, then style as needed.

```js
function dialogOpen(name) {
    let dialog = window.document.body.querySelector(".Dialog");
    if (!dialog) {
        dialog = window.document.createElement("div");
        dialog.classList.add("Dialog");
        window.document.body.appendChild(dialog);
    }

    // query article content to populate dialog
    const article = window.document.body.querySelector(`article.planet.${name}`);
    if (!article) { return; }
    dialog.innerHTML = article.innerHTML;
    dialog.style.display = "block";
}
```

A word of caution: Assigning `innerHTML` is a surprisingly expensive operation, even if you're just emptying it with a blank string! There's all sorts of parsing and deserialization the browser has to do under the hood, even if it is a method native to the DOM API itself. Be careful.

Conversly, the `dialogClose()` event is quite simple, since we just need to check to see if the dialog exists, and if it does, close it. We don't even need to know the name of the relevant planet.

```js
function dialogClose() {
    const dialog = window.document.body.querySelector(".Dialog");
    if (!dialog) { return; }
    dialog.style.display = "none";
}
```

And of course we'll want to add some modest styling for this dialog in our top-level CSS file for the application:

```css
.Dialog {
    position: absolute;
    top: 0;
    left: 0;
    background-color: rgba(50, 50, 50, 0.5);
    color: #eee;
    margin: 1rem;
    padding: 1rem;
    font-family: sans-serif;
    border: 1px solid #777;
    border-radius: 1rem;
}
```

## Wrapping It Up

Of course, we still only have the "inner" planets. We can easily add the "outer" planets just by augmenting our module-scope `planets` dictionary that is used to populate the scene. (Entries in the markup and the planet catalog already exist.)

```js
// ... }, 
{
    "name": "Jupiter",
    "radius_km": 6.9911e4,
    "semiMajorAxis_km": 7.78479e8,
    "orbitalPeriod_days": 4332.59,
    "approximateColor_hex": 0xaa7722
}, {
    "name": "Saturn",
    "radius_km": 5.8232e4,
    "semiMajorAxis_km": 1.43353e9,
    "orbitalPeriod_days": 10755.7,
    "approximateColor_hex": 0xccaa55
}, {
    "name": "Uranus",
    "radius_km": 2.5362e4,
    "semiMajorAxis_km": 2.870972e9,
    "orbitalPeriod_days": 30688.5,
    "approximateColor_hex": 0x7777ff
}, {
    "name": "Neptune",
    "radius_km": 2.4622e4,
    "semiMajorAxis_km": 4.50e9,
    "orbitalPeriod_days": 60195,
    "approximateColor_hex": 0x4422aa
}
```

This is even enough for you to start doing some verification & validation when you walk outside tonight! Take a close look at how the planets are arranged. At midnight, you're on the far side of the earth from the sun. What planets should you be able to see, if you trace the path of the zodiac (or ecliptic) from east to west? Can you see Venus, and when? What's the relative arrangement of Jupiter and Saturn? You can predict it!

![the outer planets](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6aipfbwrhnsmp6yqusu9.png)

Cool stuff.
