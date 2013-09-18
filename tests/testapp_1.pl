#!/usr/bin/env perl
use Mojolicious::Lite;

=head1 TEST APP 1

This is a little test app that does nothing but log in, log out, and
serve statically the files under tests/data if logged in.

=cut

=pod

 http://localhost:3000/file/sample_data/raw/volvox/volvox-sorted.bam
 http://localhost:3000/file/sample_data/raw/volvox/volvox-sorted.bam.bai

=cut

# Documentation browser under "/perldoc"
plugin 'PODRenderer';

app->secret('secret passphrase for test app 1');

get '/' => sub {
  my $self = shift;
  $self->render('index');
};

get '/login' => sub {
    my $self = shift;
    if( $self->session->{username} ) {
        return $self->redirect_to('/');
    }
    $self->render( 'login' );
};

post '/login' => sub {
    my $self = shift;
    if( $self->param('password') eq 'secret' ) {
        $self->session->{username} = $self->param('user');
        $self->redirect_to( delete( $self->session->{'after_login'} ) || '/' );
    }
    else {
        $self->redirect_to('login');
    }
};

get '/logout' => sub {
    my $self = shift;
    delete $self->session->{username};
    $self->redirect_to('/');
};

sub set_cors_headers {
    my ( $self ) = @_;
    $self->res->headers->add( @$_ ) for (
        ['Access-Control-Allow-Origin', '*' ],
        ['Access-Control-Allow-Credentials', 'true'],
        ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS' ],
        ['Access-Control-Allow-Headers', 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' ],
        ['Access-Control-Expose-Headers', 'Content-Range' ],
    );
}

options '/file/*path' => sub {
    my $self = shift;
    set_cors_headers( $self );
    $self->render( text => 'null' );
};

get '/file/*path' => sub {
    my $self = shift;
    my $path = $self->stash('path');

    set_cors_headers( $self );

    # unless( $self->session->{username} ) {
    #     # $self->session->{after_login} = $self->url_with;
    #     # return $self->redirect_to( "login" );
    #     $self->render( text => 'Login required' );
    #     $self->res->code(403);
    #     return;
    # }

    $self->res->headers->content_type('application/octet-stream');

    my $asset = Mojo::Asset::File->new( path => "./$path" );
    my $range = $self->req->headers->range;
    if( $range ) {
        $range =~ s/\s//g;
        my ( $start, $end ) = $range =~ /^bytes=(\d+)-(\d+)$/i;

        unless( defined $start && defined $end ) {
            $self->render( text => '501: Byte range format not supported.' );
            $self->res->code( 501 );
            return;
        }

        my $total = $asset->size;
        if( $end >= $total ) {
            $end = $total-1;
        }
        $asset->start_range( $start );
        $asset->end_range( $end );
        $self->res->headers->content_range("bytes $start-$end/$total");
        $self->res->headers->content_length( $end-$start+1 );
        $self->rendered( 206 );
    }

    $self->res->content->asset( $asset );
    $self->rendered( $range ? 206 : 200 );
};

app->start;
__DATA__

@@ login.html.ep
% layout 'default';
% title 'Login';
<form method="post">
  <label>Login<input type="text" name="user"></label>
  <label>Password<input type="password" name="password"></label>
  <input type="submit">
</form>

@@ index.html.ep
% layout 'default';
% title 'Welcome';
<h1>Welcome to Test App number 1!</h1>

@@ layouts/default.html.ep
<!DOCTYPE html>
<html>
  <head><title><%= title %></title></head>
  <body>
    <div style="float: right; width: 20em; font-weight: bold">
        <% if( session('username') ) { %>
            Hello <%=session 'username'%>! <a href="/logout">Log out</a>
        <% } else { %>
            <a href="/login">Log in</a>
        <% } %>
    </div>
    <%= content %>
  </body>
</html>
