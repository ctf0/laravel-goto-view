# Change Log

## 0.0.1

- init

## 0.0.4

- add config for methods search
- show underline under the key only instead of the whole line

## 0.0.5

- create view if not found
- fix loss search, now it will get exact match

## 0.0.6

- configs for view creation

## 0.0.7

- add copy file path for laravel usage

## 0.0.9

- fix typo in `laravel_goto_view.viewDefaultValue`
- fix linking to dynamic views (with variable in its name)
- remove `view()->share` from default methods

## 0.1.0

- add new command to easily go to path from path ex.`some.path.file`
- add more methods to defaults

## 0.1.2

- fix package settings name

## 0.2.0

- i recently started using [laravel-modules](https://nwidart.com/laravel-modules/v6/installation-and-setup) & manual navigation is just impossible, so now we have support to a custom internal & vendor paths 🎊 💃 🚀,

    make sure u r following the nameing convention of `Pascal > Snake` ex.
    + `module namespace` > `MyDashboard`
    + `view namespace` > `my_dashboard`
- also now the hover card will show the full file path from root instead of just its name
- oh & Merry Christmas 🎄

## 0.3.0

- add code lens to search for content in blade files which also support `@yield & @section`, toggle `laravelGotoView.showCodeLens` to disable this feature.
- cache already resolved data to avoid refetching on each file scroll/open.
- adding links should be 2x faster, if u have issues plz open a ticket.

## 0.3.2

- add new config `watchFilesForChanges`
