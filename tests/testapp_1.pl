#!/usr/bin/env perl
use Mojolicious::Lite;

=head1 TEST APP 1

This is a little test app that does nothing but log in, log out, and
serve statically the files under tests/data if logged in.

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
    if( $self->param('password') eq 'seekrit!' ) {
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

get '/file/*path' => sub {
    my $self = shift;
    my $path = $self->stash('path');
    unless( $self->session->{username} ) {
        $self->session->{after_login} = "/file/$path";
        return $self->redirect_to( "login" );
    }

    my $f = "data/$path";
    #$self->render( text => Cwd::getcwd() );
    $self->res->headers->content_type('application/octet-stream');
    $self->res->content->asset( Mojo::Asset::File->new( path => $f ) );
    $self->rendered(200);
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
