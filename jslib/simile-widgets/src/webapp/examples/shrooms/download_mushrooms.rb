require 'rubygems'
require 'json'
require 'mechanize'

@header = <<EOF
@prefix owl: <http://www.w3.org/2002/07/owl#>  .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>  .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>  .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>  .
@prefix foaf: <http://xmlns.com/foaf/0.1/>  .
@prefix dc: <http://purl.org/dc/elements/1.1/>  .
@prefix : <http://dbpedia.org/resource/>  .
@prefix dbpedia2: <http://dbpedia.org/property/>  .
@prefix dbpedia: <http://dbpedia.org/>  .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

EOF

@agent = WWW::Mechanize.new
@agent.user_agent_alias = 'Mac FireFox'
@mushrooms = JSON.parse(File.read('mushrooms.json'))
@datapoints = ["name", "stipecharacter", "hymeniumtype", "howedible", "ecologicaltype", "capshape", "sporeprintcolor", "wikipage"]
@page = ''
@characteristicimages = Hash.new
@characteristics = @datapoints.inject(Hash.new) { |h, c | h[c] = Hash.new; h }
puts @header + "\n\n"
@mushrooms["results"]["bindings"].each do | mushroom |
	@page = @agent.get(mushroom["wikipage"]["value"])
	@shroomimage = @page.search('//img').find { | s | s['alt'].downcase.include?(mushroom["name"]["value"].downcase) }
	next if @shroomimage.nil?
	puts "<#{mushroom['fungi']['value']}> foaf:depiction <#{@shroomimage['src']}> ."
	puts "<#{mushroom['fungi']['value']}> rdf:type <http://dbpedia.org/resource/Mushroom> ."
	@datapoints.each do | dp |
		@characteristics[dp][mushroom[dp]['value']] = true unless (mushroom[dp]['value'].include?(' ') || mushroom[dp]['value'].include?('http'))
		puts "<#{mushroom['fungi']['value']}> dbpedia2:#{dp} \"#{mushroom[dp]['value'].gsub(/[\n\"]/, '')}\" ."
	end
	puts "\n\n"
        @page.search('//table//table[//a[@title="Hymenium"]').search('//img').inject(@characteristicimages) { | hash, im | hash[im['src']] = true; hash }
end

@characteristics.each { | c, h |
	h.each_key { | v |
		puts ":#{v} a dbpedia2:#{c} .\n"
	}
}

File.open("/Users/jaresty/Desktop/imagefacets.list", 'w') do | f |
	f << @characteristicimages.keys.join("\n")
end
