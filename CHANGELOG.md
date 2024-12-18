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

## 0.3.3

- fix range is undefined
- fix hl keys that ends with `.`

## 0.3.4

- add new entry under picker to open all files
- auto scroll to view name after choosing a file from the picker
- you can now view the total files found in the lens as well

## 0.3.7

- fix wrong path seperator for windows
- fix incorrect hl for `Route::view()`
- add support for `Route::view()`

## 0.3.8

- hide codelens if the view is declared only once
- add `@stack` to code lens directives list

## 0.4.1

- use the correct file opening command

## 0.4.2

- make sure path separators are normalized

## 0.4.3

- make sure path separator are aligned with os

## 0.5.0

- fix link popup not being clickable
- use a cmnd instead of the uri handler
- better api

## 0.5.7

- add `copy file path` code lens to blade
- add `open file path` code lens to php
- add new config `laravelGotoView.openPathCodelens`

## 0.6.0

- fix open file path cmnd

## 0.6.3

- fix create unfounded file not working
