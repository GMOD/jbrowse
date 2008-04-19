echo "["
for lang in $(ls [a-z][a-z].xml |sed s/.xml//)
do
	echo '{ type: "language", iso: "'${lang}'",'

	# countries that use this language
	echo 'countries: ['
	ls ${lang}_[A-Z][A-Z].xml | sed -e 's/^.*_/{_reference: "/' -e 's/.xml/"},/'
	echo '],'

	# name of this language (in this language)
	grep '<language type="'${lang}'"[ >]' ${lang}.xml |head -1 |sed -e 's/.*<language type=".."[^>]*>/name: "/' -e 's/<\/language>/",/'

	# names of other langauges (in this language)
	grep '<language type="..">' ${lang}.xml |sed -e 's/.*<language type=//' -e 's/<\/language>/",/' -e 's/>/: "/' -e 's/-->//'
	echo '},'
done
echo "]"
