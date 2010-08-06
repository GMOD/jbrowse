// miscellaneous useful macros

#ifndef MACROS_INCLUDED
#define MACROS_INCLUDED

// Container iterator macros. There are two kinds:
// (1) template iterator macros, using "typename";
// (2) nontemplate iterator macros, using typedefs without "typename".

// Prefixes used by the iterator macros
#define TEMP_END_ITERATOR_PREFIX  _end_
#define TEMP_CONTAINER_PREFIX     _container_

// (1) template iterator macros, using "typename"
#define template_for_contents(ContainerType, Container, Iterator) for ( typename ContainerType ::iterator Iterator = ( Container ).begin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).end(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define template_for_const_contents(ContainerType, Container, Iterator) for ( typename ContainerType ::const_iterator Iterator = ( Container ).begin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).end(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define template_for_reverse_contents(ContainerType, Container, Iterator) for ( typename ContainerType ::reverse_iterator Iterator = ( Container ).rbegin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).rend(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define template_for_const_reverse_contents(ContainerType, Container, Iterator) for ( typename ContainerType ::const_reverse_iterator Iterator = ( Container ).rbegin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).rend(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

// (2) nontemplate iterator macros, using typedefs without "typename"
#define for_contents(ContainerType, Container, Iterator) for ( ContainerType ::iterator Iterator = ( Container ).begin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).end(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define for_const_contents(ContainerType, Container, Iterator) for ( ContainerType ::const_iterator Iterator = ( Container ).begin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).end(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define for_tmp_contents(ContainerType, ContainerExpr, Iterator) ContainerType TEMP_CONTAINER_PREFIX ## Iterator = ContainerExpr; for ( ContainerType ::iterator Iterator = TEMP_CONTAINER_PREFIX ## Iterator .begin(), TEMP_END_ITERATOR_PREFIX ## Iterator = TEMP_CONTAINER_PREFIX ## Iterator .end(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define for_reverse_contents(ContainerType, Container, Iterator) for ( ContainerType ::reverse_iterator Iterator = ( Container ).rbegin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).rend(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define for_const_reverse_contents(ContainerType, Container, Iterator) for ( ContainerType ::const_reverse_iterator Iterator = ( Container ).rbegin(), TEMP_END_ITERATOR_PREFIX ## Iterator = ( Container ).rend(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

#define for_tmp_reverse_contents(ContainerType, ContainerExpr, Iterator) ContainerType TEMP_CONTAINER_PREFIX ## Iterator = ContainerExpr; for ( ContainerType ::reverse_iterator Iterator = TEMP_CONTAINER_PREFIX ## Iterator .rbegin(), TEMP_END_ITERATOR_PREFIX ## Iterator = TEMP_CONTAINER_PREFIX ## Iterator .rend(); !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

// for_iterator macro
#define for_iterator(IteratorType, Iterator, Begin, End) for ( IteratorType Iterator = Begin, TEMP_END_ITERATOR_PREFIX ## Iterator = End; !(Iterator == TEMP_END_ITERATOR_PREFIX ## Iterator); ++ Iterator )

// "begin, end" iterator macro
#define begin_end(Container) ( Container ).begin(), ( Container ).end()

#endif
